# @adwd/inertia-preact

A [Preact](https://preactjs.com) adapter for [Inertia.js](https://inertiajs.com) 3.

It builds on `@inertiajs/core`, like the official adapters, and offers the same features: pages and persistent layouts, links and visits, forms with Precognition, `useHttp`, partial reloads, deferred props, polling, prefetching, infinite scrolling, head management and server-side rendering.

The API follows the Inertia documentation for React where that fits Preact, and uses Preact's own mechanisms where Preact differs (see [Differences from the React adapter](#differences-from-the-react-adapter)). It depends on `preact` only: it doesn't use `preact/compat`, and works whether your app uses it or not.

- Preact 10.27.2 or later, and Preact 11
- Verified with the official Inertia end-to-end test suite (see [Development](#development))

## Installation

```bash
npm install @adwd/inertia-preact preact
```

The package is also published to [GitHub Packages](https://github.com/adwd/inertia-preact/pkgs/npm/inertia-preact). Installing from there needs a [personal access token (classic)](https://github.com/settings/tokens) with the `read:packages` scope, even though the package is public, and this in the `.npmrc` of your project:

```ini
@adwd:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

For server-side rendering, also install `preact-render-to-string`.

## Setup

```tsx
// app.tsx
import { createInertiaApp } from '@adwd/inertia-preact'

createInertiaApp({
  resolve: (name) => {
    const pages = import.meta.glob('./Pages/**/*.tsx', { eager: true })
    return pages[`./Pages/${name}.tsx`]
  },
})
```

Without `setup`, the app renders into (or hydrates, when server-rendered) the element with the `id` option (`app` by default). To render it yourself:

```tsx
import { hydrate, render } from 'preact'

createInertiaApp({
  resolve: (name) => /* ... */,
  setup({ el, App, props }) {
    const app = <App {...props} />

    if (props.serverRendered) {
      hydrate(app, el)
    } else {
      render(app, el)
    }
  },
})
```

All other options of `createInertiaApp` (`title`, `layout`, `progress`, `defaults`, `http`, `serverHead`, `nonce`, ...) work as described in the Inertia documentation. `withApp` wraps the app, e.g. in context providers, on the client and the server:

```tsx
createInertiaApp({
  resolve: (name) => /* ... */,
  withApp: (app, { page }) => <ThemeProvider theme={page.props.theme}>{app}</ThemeProvider>,
})
```

### Vite

The `@inertiajs/vite` plugin knows the official adapters. Register the Preact one to use the `pages` shorthand and the SSR dev server:

```ts
// vite.config.ts
import inertia from '@inertiajs/vite'
import preact from '@preact/preset-vite'
import inertiaPreact from '@adwd/inertia-preact/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [inertia({ frameworks: inertiaPreact }), preact()],
})
```

```tsx
// app.tsx
createInertiaApp({ pages: './Pages' })
```

### Server-side rendering

With the Vite plugin, the same entry works on the server: the plugin wraps it in an SSR server that renders with `preact-render-to-string`.

Without it, render the page yourself:

```tsx
// ssr.tsx
import { createInertiaApp } from '@adwd/inertia-preact'
import createServer from '@adwd/inertia-preact/server'
import { renderToString } from 'preact-render-to-string'

createServer((page) =>
  createInertiaApp({
    page,
    render: renderToString,
    resolve: (name) => {
      const pages = import.meta.glob('./Pages/**/*.tsx', { eager: true })
      return pages[`./Pages/${name}.tsx`]
    },
  }),
)
```

## Pages and layouts

A page is a component receiving the page props. A layout is set with a static `layout` property, and persists across visits to pages with the same layout:

```tsx
import type { ComponentChildren } from 'preact'

function AppLayout({ children, title }: { children?: ComponentChildren; title?: string }) {
  return (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  )
}

export default function Users({ users }: { users: { id: number; name: string }[] }) {
  return <ul>{users.map((user) => <li key={user.id}>{user.name}</li>)}</ul>
}

Users.layout = [AppLayout, { title: 'Users' }]
```

`layout` accepts everything Inertia supports: a component, nested layouts (`[Outer, Inner]`), `[Layout, props]`, named layouts, a render function (`(page) => <AppLayout>{page}</AppLayout>`), props for the default layout, or a callback receiving the page props (`(props) => [AppLayout, { title: props.user.name }]`). Define layout components as function declarations: an arrow function taking a single argument is treated as a render function or callback. `setLayoutProps()` and `resetLayoutProps()` update layout props from within the page.

## API

| Export | |
| --- | --- |
| `createInertiaApp`, `App` | Creating the app (see above) |
| `usePage()` | The current page (`component`, `props`, `url`, `flash`, ...) |
| `router`, `http`, `progress`, `config` | From `@inertiajs/core` |
| `<Link>` | Visits without a full page load. Renders an `<a>`, a `<button>` for other methods than GET, or the element / component given with `as`. Supports `prefetch`, `cacheFor`, `cacheTags` and every visit option |
| `<Head>` | Sets the title and elements of `<head>`, also during SSR. Give elements a `head-key` to replace them on other pages |
| `useForm()` | Form helper: `data`, `setData`, `errors`, `processing`, `progress`, `isDirty`, `submit` / `post` / `put` / ..., `reset`, `setDefaults`, `transform`, `optimistic`, remembering with a key, and Precognition (`useForm('post', '/users', data)` or `withPrecognition()`) |
| `<Form>` | A form that submits with a visit, reading the data from its fields. Its state and methods are passed to a `children` function and to `useFormContext()` |
| `useHttp()` | Like `useForm()`, for plain HTTP requests (e.g. to a JSON API), keeping the `response` |
| `useRemember(initialState, key?)` | Like `useState`, kept in the history state |
| `<Deferred data fallback>` | Renders a fallback until deferred props are loaded |
| `<WhenVisible data fallback>` | Loads props when the element scrolls into view |
| `<InfiniteScroll data>` | Loads the next and previous pages of a scroll prop while scrolling, or manually |
| `<WhenMounted fallback>` | Renders its children only in the browser (the fallback on the server and while hydrating) |
| `usePoll(interval, reloadOptions?, pollOptions?)` | Reloads the page props periodically. Returns `start`, `stop`, `polling` |
| `usePrefetch()` | The prefetch state of the current page |
| `setLayoutProps()`, `resetLayoutProps()` | Layout props from within a page |

The state and methods of `useForm()` are a new object whenever something changes, while the methods themselves never change. So the form object works as a dependency of hooks and with memoized components, and `form.setData` can be passed around freely.

### Refs

`<Form>` and `<InfiniteScroll>` are class components: a `ref` gives their instance, which has the same API as the ref of the official adapters (`FormComponentRef`: `submit()`, `reset()`, `errors`, `isDirty`, ...; `InfiniteScrollRef`: `fetchNext()`, `fetchPrevious()`, `hasNext()`, `hasPrevious()`).

```tsx
const form = useRef<Form>(null)

<Form ref={form} action="/users" method="post">...</Form>
<button onClick={() => form.current?.submit()}>Save</button>
```

## Differences from the React adapter

| | `@adwd/inertia-preact` | `@inertiajs/react` |
| --- | --- | --- |
| Refs of `<Form>` / `<InfiniteScroll>` | The component instance (same API) | `forwardRef` / `useImperativeHandle` |
| Ref of `<Link>` | Not supported on Preact 10, which doesn't pass `ref` to function components (on Preact 11, it is passed to the element) | Forwarded to the element |
| `strictMode` option | None (Preact has no `StrictMode`) | Wraps the app in `<StrictMode>` |
| `setData(object)` | Merges the fields into the data (like the Vue and Svelte adapters) | Replaces the data |
| `<Head>` text content | HTML-escaped (except in `script` and `style`), like the DOM would | Inserted as is |
| Types | `PageComponent`, `InertiaForm`, `LinkProps` | `ResolvedComponent`, `InertiaFormProps`, `InertiaLinkProps` |
| Events | Native DOM events (use `onInput` for text fields, `event.currentTarget`) | React's synthetic events |

## Development

```bash
pnpm install
pnpm build          # the adapter
pnpm test           # unit tests
pnpm type-check     # the adapter and the test app
pnpm lint
pnpm test:e2e       # the official Inertia end-to-end suite (Chromium)
pnpm test:e2e:ssr   # its server-side rendering tests
```

The end-to-end suite comes from the Inertia repository, which `scripts/e2e.mjs` checks out at a pinned commit, replacing its React adapter and test app with this adapter and `test-app/` (the React test app, written for Preact). See the script for its options: other browsers, the axios HTTP client, another Preact version, `preact/debug`, `preact/compat`.

## License

MIT
