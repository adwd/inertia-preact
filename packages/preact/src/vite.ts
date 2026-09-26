/**
 * Framework configuration for the `@inertiajs/vite` plugin, which detects the Vue, React and Svelte adapters
 * out of the box. Register it to get the `pages` shorthand and the SSR dev server with Preact:
 *
 * ```js
 * import inertia from '@inertiajs/vite'
 * import preact from 'inertia-preact/vite'
 *
 * export default defineConfig({
 *   plugins: [inertia({ frameworks: preact })],
 * })
 * ```
 *
 * The SSR entry is rendered with `renderToString` from `preact-render-to-string`, which the app must install.
 */
export interface FrameworkConfig {
  package: string
  extensions: string[]
  extractDefault?: boolean
  ssr?: (configureCall: string, options: string) => string
}

const preact: FrameworkConfig = {
  package: 'inertia-preact',
  extensions: ['.tsx', '.jsx'],
  extractDefault: true,
  ssr: (configureCall, options) => `
import createServer from 'inertia-preact/server'
import { renderToString } from 'preact-render-to-string'

const renderPromise = ${configureCall}

// Logged here so it never goes unhandled, and reported again per render by the SSR server
renderPromise.catch((error) => console.error(error))

const renderPage = async (page) => {
  const render = await renderPromise

  return render(page, renderToString)
}

if (import.meta.env.PROD) {
  createServer(renderPage${options})
}

export default renderPage
`,
}

export default preact
