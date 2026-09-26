#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import esbuild from 'esbuild'

const watch = process.argv.includes('--watch')
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// Everything the package depends on stays external, so the app shares one Preact and one router instance
const external = [...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies)].flatMap((name) => [
  name,
  `${name}/*`,
])

const builds = [
  { entryPoints: ['src/index.ts'], outfile: 'dist/index.js', platform: 'browser' },
  { entryPoints: ['src/server.ts'], outfile: 'dist/server.js', platform: 'node' },
  { entryPoints: ['src/vite.ts'], outfile: 'dist/vite.js', platform: 'node' },
]

await Promise.all(
  builds.map(async (build) => {
    const context = await esbuild.context({
      ...build,
      bundle: true,
      format: 'esm',
      target: 'es2022',
      sourcemap: true,
      external,
    })

    if (watch) {
      await context.watch()
      console.log(`Watching ${build.entryPoints}…`)
    } else {
      await context.rebuild()
      await context.dispose()
      console.log(`Built ${build.outfile}`)
    }
  }),
)
