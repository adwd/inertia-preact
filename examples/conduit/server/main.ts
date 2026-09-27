// The production server, built by `vite build --ssr` next to the client build
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { createApp } from './app.ts'
import { Store } from './db.ts'
import { seed } from './seed.ts'

interface ManifestChunk {
  file: string
  css?: string[]
  imports?: string[]
}

const clientDir = fileURLToPath(new URL('../client', import.meta.url))
const manifest = JSON.parse(readFileSync(`${clientDir}/.vite/manifest.json`, 'utf8')) as Record<string, ManifestChunk>
const entry = manifest['src/client.tsx']

// The entry, its styles, and the chunks it imports, preloaded
const preloads = (entry.imports ?? []).map((name) => `<link rel="modulepreload" href="/${manifest[name].file}" />`)
const styles = (entry.css ?? []).map((file) => `<link rel="stylesheet" href="/${file}" />`)

const assets = {
  head: [...styles, ...preloads, `<script type="module" src="/${entry.file}"></script>`].join('\n    '),
  version: entry.file,
}

const store = new Store(process.env.DATABASE ?? ':memory:')
store.deleteExpiredSessions()
await seed(store)

const app = new Hono()

// Built files have hashed names, so they can be cached for good
app.use(
  '/assets/*',
  serveStatic({
    root: clientDir,
    onFound: (_path, c) => c.header('Cache-Control', 'public, max-age=31536000, immutable'),
  }),
)
app.use(serveStatic({ root: clientDir }))
app.route('/', createApp({ store, assets }))

const port = Number(process.env.PORT ?? 3000)

serve({ fetch: app.fetch, port }, () => {
  console.log(`Conduit running at http://localhost:${port}`)
})
