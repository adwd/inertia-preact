import type { PageComponent } from '@adwd/inertia-preact'
import Layout from './components/Layout.tsx'

// The options of the app, on the client and the server

const pages = import.meta.glob<{ default: PageComponent }>('./pages/**/*.tsx')

export async function resolve(name: string) {
  const page = pages[`./pages/${name}.tsx`]

  if (!page) {
    throw new Error(`Page not found: ${name}`)
  }

  return page()
}

export const title = (title: string) => (title ? `${title} — Conduit` : 'Conduit')

/** Every page has the layout, which persists across visits */
export const layout = () => Layout
