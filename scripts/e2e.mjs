#!/usr/bin/env node
/**
 * Runs the official Inertia.js Playwright suite against the Preact adapter.
 *
 * The Inertia repository is checked out at a pinned commit in `e2e/inertia`, where the React adapter is
 * replaced: this repository's adapter goes to `packages/preact` and its test app to `packages/react/test-app`.
 * The suite then runs with `PACKAGE=react`, so the test server serves the Preact test app, and the tests the
 * suite only runs for React run for Preact too.
 *
 * Usage: node scripts/e2e.mjs [--ssr] [--debug] [--firefox | --webkit] [--prepare | --skip-install] [playwright args...]
 *
 *   node scripts/e2e.mjs                        all tests, in Chromium
 *   node scripts/e2e.mjs tests/links.spec.ts    one spec
 *   node scripts/e2e.mjs --ssr                  the SSR tests
 *   node scripts/e2e.mjs --debug                with preact/debug, reporting its warnings and errors
 *   node scripts/e2e.mjs --prepare              only check out, install and build (e.g. to install browsers next)
 *
 * Environment: INERTIA_REF (a commit to use instead of the pinned one), VITE_HTTP_CLIENT=axios (use axios),
 * PREACT_VERSION (a Preact version to use instead of the one in the lockfile, e.g. 11.0.0-rc.2),
 * VITE_PREACT_COMPAT=true (run the test app with preact/compat, like an app using it).
 */
import { execFileSync, spawn, spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// v3.7.1. Keep in sync with docs/PLAN.md.
const PINNED_REF = '1ca37df4b9bb42b207796cdabc8bf865782afa0c'
const REPOSITORY = 'https://github.com/inertiajs/inertia.git'

// Tests of React features that Preact doesn't have, so they don't apply (see docs/PLAN.md)
const NOT_APPLICABLE = [
  // React's <StrictMode>, for which the React adapter has a `strictMode` option
  'createInertiaApp it wraps the app in StrictMode when enabled',
  'createInertiaApp it does not wrap the app in StrictMode by default',
]

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// Not in a dot directory: the test server (Express) doesn't serve files from paths containing one
const checkout = join(root, 'e2e', 'inertia')
const ref = process.env.INERTIA_REF || PINNED_REF

const args = process.argv.slice(2)

function takeFlag(flag) {
  const index = args.indexOf(flag)

  if (index !== -1) {
    args.splice(index, 1)
  }

  return index !== -1
}

const ssr = takeFlag('--ssr')
const skipInstall = takeFlag('--skip-install')
const prepareOnly = takeFlag('--prepare')
const debug = takeFlag('--debug')

if (debug) {
  // Read when the test app is built, see test-app/tools
  process.env.VITE_PREACT_DEBUG = 'true'
}
const browser = takeFlag('--firefox') ? 'firefox' : takeFlag('--webkit') ? 'webkit' : 'chromium'

function run(command, commandArgs, options = {}) {
  console.log(`\n$ ${command} ${commandArgs.join(' ')}`)

  const { status } = spawnSync(command, commandArgs, { stdio: 'inherit', ...options })

  if (status !== 0) {
    process.exit(status ?? 1)
  }
}

function git(...gitArgs) {
  return execFileSync('git', ['-C', checkout, ...gitArgs], { encoding: 'utf8' }).trim()
}

function checkOutInertia() {
  if (!existsSync(join(checkout, '.git'))) {
    mkdirSync(dirname(checkout), { recursive: true })
    run('git', ['clone', '--filter=blob:none', '--no-checkout', REPOSITORY, checkout])
  }

  if (spawnSync('git', ['-C', checkout, 'cat-file', '-e', `${ref}^{commit}`]).status !== 0) {
    run('git', ['-C', checkout, 'fetch', 'origin', ref])
  }

  // Start from a pristine checkout. Ignored files (dependencies, builds) are kept to speed up reruns.
  git('checkout', '--force', '--detach', ref)
  git('clean', '-fd')
  console.log(`Inertia checkout at ${git('rev-parse', 'HEAD')}`)
}

function editJson(path, edit) {
  const json = JSON.parse(readFileSync(path, 'utf8'))
  edit(json)
  writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`)
}

// Builds against the core and Vite plugin of the checkout, sharing a single core (and router) instance
function useWorkspaceVersions(packageJson, names) {
  editJson(packageJson, (json) => {
    for (const dependencies of [json.dependencies, json.devDependencies]) {
      for (const name of names) {
        if (dependencies?.[name]) {
          dependencies[name] = 'workspace:*'
        }
      }
    }
  })
}

function replaceReactWithPreact() {
  // The installed dependencies of the test app are kept, for --skip-install
  const testAppModules = join(checkout, 'packages/react/test-app/node_modules')
  const keptModules = join(checkout, '..', 'test-app-node_modules')

  rmSync(keptModules, { recursive: true, force: true })

  if (existsSync(testAppModules)) {
    renameSync(testAppModules, keptModules)
  }

  // Only core, the Vite plugin, the adapter with its test app, and the test server are needed
  for (const path of ['packages/react', 'packages/vue3', 'packages/svelte', 'playgrounds']) {
    rmSync(join(checkout, path), { recursive: true, force: true })
  }

  const copy = (from, to) =>
    cpSync(join(root, from), join(checkout, to), {
      recursive: true,
      filter: (source) => !/(^|[\\/])(node_modules|dist|types)$/.test(relative(root, source)),
    })

  copy('packages/preact', 'packages/preact')
  copy('test-app', 'packages/react/test-app')

  if (existsSync(keptModules)) {
    renameSync(keptModules, testAppModules)
  }

  useWorkspaceVersions(join(checkout, 'packages/preact/package.json'), ['@inertiajs/core'])
  useWorkspaceVersions(join(checkout, 'packages/react/test-app/package.json'), ['@inertiajs/core', '@inertiajs/vite'])

  const workspace = join(checkout, 'pnpm-workspace.yaml')
  let workspaceConfig = readFileSync(workspace, 'utf8').replace(/^\s*- playgrounds\/\*\n/m, '')

  if (process.env.PREACT_VERSION) {
    // One Preact version for everything, including the dependencies of other packages
    workspaceConfig = workspaceConfig.replace(/^overrides:\n/m, `overrides:\n  preact: ${process.env.PREACT_VERSION}\n`)
  }

  writeFileSync(workspace, workspaceConfig)
}

checkOutInertia()
replaceReactWithPreact()

if (!skipInstall) {
  // The lockfile describes the upstream workspace, so it can't be used as is
  run('pnpm', ['install', '--no-frozen-lockfile'], { cwd: checkout })
}

run('pnpm', ['-r', '--filter', './packages/{core,vite,preact}', 'build'], { cwd: checkout })

if (prepareOnly) {
  process.exit(0)
}

// Playwright builds the test app too, but not when it reuses a test server that is already running
const testApp = ['--filter', './packages/react/test-app']
run('pnpm', [...testApp, 'build'], { cwd: checkout })

if (ssr) {
  run('pnpm', [...testApp, 'build:ssr'], { cwd: checkout })
  run('pnpm', [...testApp, 'build:ssr-auto'], { cwd: checkout })
}

// The test servers are started here rather than by Playwright, which reuses them: Playwright doesn't
// always manage to stop the servers it starts through pnpm, and then never exits.
const env = { ...process.env, PACKAGE: 'react', ...(ssr ? { SSR: 'true' } : {}) }
// Outside CI Playwright reuses running servers; pass --retries / --workers to get the CI behaviour
delete env.CI

const servers = []

function stopServers() {
  servers.splice(0).forEach((server) => server.kill())
}

process.on('exit', stopServers)
process.on('SIGINT', () => process.exit(130))
process.on('SIGTERM', () => process.exit(143))

async function isUp(url) {
  try {
    return (await fetch(url)).status < 500
  } catch {
    return false
  }
}

async function startServer(name, url, command, commandArgs, cwd) {
  if (await isUp(url)) {
    console.log(`Reusing the ${name} running at ${url}`)
    return
  }

  servers.push(spawn(command, commandArgs, { cwd: join(checkout, cwd), env, stdio: ['ignore', 'inherit', 'inherit'] }))

  for (let attempt = 0; !(await isUp(url)); attempt++) {
    if (attempt > 300) {
      throw new Error(`The ${name} didn't start at ${url}`)
    }

    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

await startServer('test server', 'http://localhost:13716', 'node', ['server.js'], 'tests/app')

if (ssr) {
  const dist = 'packages/react/test-app/dist'
  await startServer('SSR server', 'http://localhost:13714/health', 'node', ['ssr.js'], dist)
  await startServer('SSR server (auto)', 'http://localhost:13719/health', 'node', ['ssr-auto.js'], dist)
}

// `--project=<name>` rather than `--project <name>`, which would also take the spec paths that follow
const projectArgs = args.some((arg) => arg.startsWith('--project')) ? [] : [`--project=${browser}`]
const escape = (title) => title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const skipArgs = [`--grep-invert=${NOT_APPLICABLE.map((title) => `${escape(title)}$`).join('|')}`]
const debugArgs = debug ? [`--config=${writeDebugConfig()}`] : []

// With --debug, Chromium writes the console to its log output, which Playwright passes on with DEBUG=pw:browser
function writeDebugConfig() {
  const path = join(checkout, 'playwright.preact-debug.config.ts')

  writeFileSync(
    path,
    `import config from './playwright.config'

export default {
  ...config,
  projects: config.projects.map((project) => ({
    ...project,
    use: { ...project.use, launchOptions: { args: ['--enable-logging=stderr', '--v=0'] } },
  })),
}
`,
  )

  return path
}

const debugMessages = new Map()

const playwright = spawn('npx', ['playwright', 'test', ...projectArgs, ...skipArgs, ...debugArgs, ...args], {
  cwd: checkout,
  env: debug ? { ...env, DEBUG: 'pw:browser' } : env,
  stdio: ['inherit', 'inherit', debug ? 'pipe' : 'inherit'],
})

if (debug) {
  let buffer = ''

  playwright.stderr.on('data', (chunk) => {
    buffer += chunk
    const lines = buffer.split('\n')
    buffer = lines.pop()

    for (const line of lines) {
      const match = line.match(/\[preact-debug\] (\w+) (\S+) (\S+)/)

      if (match) {
        const key = `${match[1]}: ${decodeURIComponent(match[3])}`
        const entry = debugMessages.get(key) ?? { count: 0, urls: new Set() }
        entry.count++
        entry.urls.add(match[2])
        debugMessages.set(key, entry)
      } else if (!line.includes('pw:browser')) {
        process.stderr.write(`${line}\n`)
      }
    }
  })
}

const status = await new Promise((resolve) => playwright.on('close', resolve))

if (debug) {
  console.log(`\npreact/debug reported ${debugMessages.size} distinct warning(s) or error(s)`)

  debugMessages.forEach(({ count, urls }, message) =>
    console.log(`\n[${count}x, on ${[...urls].slice(0, 5).join(' ')}${urls.size > 5 ? ' ...' : ''}]\n${message}`),
  )
}

process.exit(status ?? 1)
