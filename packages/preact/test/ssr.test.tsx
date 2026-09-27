import type { Page } from '@inertiajs/core'
import type { ComponentChildren } from 'preact'
import { renderToString } from 'preact-render-to-string'
import { describe, expect, test } from 'vitest'
import { createInertiaApp, Head, usePage } from '../src'

function page(component: string, props: Record<string, unknown> = {}): Page {
  return { component, props, url: '/test', version: null } as unknown as Page
}

function Layout({ children, title }: { children?: ComponentChildren; title?: string }) {
  return <main data-title={title}>{children}</main>
}

function Greeting({ name }: { name: string }) {
  const { component } = usePage()

  return (
    <>
      <Head title={`Hello ${name}`}>
        <meta name="description" content="Greeting" />
      </Head>
      <p>
        {component}: Hello {name}
      </p>
    </>
  )
}

describe('server-side rendering', () => {
  test('renders the page, its head and the page data', async () => {
    const { head, body } = await createInertiaApp({
      page: page('Greeting', { name: '<Preact>' }),
      render: renderToString,
      resolve: () => Greeting,
      title: (title) => `${title} - App`,
    })

    expect(body).toContain('<div data-server-rendered="true" id="app"><p>Greeting: Hello &lt;Preact></p></div>')
    expect(body).toContain('<script data-page="app" type="application/json">')
    expect(head).toEqual([
      '<meta name="description" content="Greeting" data-inertia>',
      '<title data-inertia="">Hello &lt;Preact&gt; - App</title>',
    ])
  })

  test('wraps the page in its layouts, with layout props', async () => {
    function WithLayout() {
      return <p>Content</p>
    }
    WithLayout.layout = [Layout, { title: 'Nested' }]

    const { body } = await createInertiaApp({
      page: page('WithLayout'),
      render: renderToString,
      resolve: () => WithLayout,
    })

    expect(body).toContain('<main data-title="Nested"><p>Content</p></main>')
  })

  test('uses the default layout, and a layout callback for its props', async () => {
    function WithCallback() {
      return <p>Content</p>
    }
    WithCallback.layout = (props: { heading: string }) => ({ title: props.heading })

    const { body } = await createInertiaApp({
      page: page('WithCallback', { heading: 'From props' }),
      render: renderToString,
      resolve: () => WithCallback,
      layout: () => Layout,
    })

    expect(body).toContain('<main data-title="From props"><p>Content</p></main>')
  })

  test('supports render function layouts', async () => {
    function WithRenderFunction() {
      return <p>Content</p>
    }
    WithRenderFunction.layout = (page: ComponentChildren) => <Layout title="Rendered">{page}</Layout>

    const { body } = await createInertiaApp({
      page: page('WithRenderFunction'),
      render: renderToString,
      resolve: () => ({ default: WithRenderFunction }),
    })

    expect(body).toContain('<main data-title="Rendered"><p>Content</p></main>')
  })

  test('returns a render function without a page, for the Vite SSR transform', async () => {
    const render = await createInertiaApp({
      resolve: () => Greeting,
      withApp: (app) => <section>{app}</section>,
    })

    const { body } = await render!(page('Greeting', { name: 'World' }), renderToString)

    expect(body).toContain('<section><p>Greeting: Hello World</p></section>')
  })
})
