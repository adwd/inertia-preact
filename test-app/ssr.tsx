import { createInertiaApp, type PageComponent } from 'inertia-preact'
import createServer from 'inertia-preact/server'
import { renderToString } from 'preact-render-to-string'

createServer((page) =>
  createInertiaApp({
    page,
    render: renderToString,
    serverHead: (page) => page.props.head as string[],
    resolve: (name) => {
      const pages = import.meta.glob<PageComponent>('./Pages/SSR/**/*.tsx', { eager: true })
      return pages[`./Pages/${name}.tsx`]
    },
    setup: ({ App, props }) => <App {...props} />,
    ...(page.url.includes('withTitleCallback') && {
      title: (title, page) => [title, page.props.titleSuffix].filter(Boolean).join(' | '),
    }),
  }),
)
