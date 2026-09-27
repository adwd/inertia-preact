// The development server: Vite serves the client (with hot reloading) and loads the Hono app, which it
// reloads when its files change. The data lives as long as this process.
import { createServer } from 'node:http'
import { getRequestListener } from '@hono/node-server'
import { createServer as createViteServer } from 'vite'
import { Store } from './db.ts'
import { seed } from './seed.ts'

const port = Number(process.env.PORT ?? 5173)
const store = new Store(process.env.DATABASE ?? ':memory:')
await seed(store)

const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom' })

const assets = {
  head: '<script type="module" src="/@vite/client"></script>\n    <script type="module" src="/src/client.tsx"></script>',
  version: null,
}

let loaded: { module: unknown; app: { fetch: (request: Request) => Response | Promise<Response> } } | undefined

const listener = getRequestListener(async (request) => {
  const module = (await vite.ssrLoadModule('/server/app.ts')) as typeof import('./app.ts')

  if (loaded?.module !== module) {
    loaded = { module, app: module.createApp({ store, assets }) }
  }

  return loaded.app.fetch(request)
})

createServer((req, res) => {
  vite.middlewares(req, res, () => {
    listener(req, res).catch((error: unknown) => {
      vite.ssrFixStacktrace(error as Error)
      console.error(error)
      res.statusCode = 500
      res.end('Internal Server Error')
    })
  })
}).listen(port, () => {
  console.log(`Conduit running at http://localhost:${port}`)
})
