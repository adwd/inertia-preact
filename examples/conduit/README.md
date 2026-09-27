# Conduit: RealWorld with Hono, Inertia and Preact

[RealWorld](https://github.com/realworld-apps/realworld)'s Conduit, a Medium clone, built with [Hono](https://hono.dev) on the server, [Inertia](https://inertiajs.com) ([`@hono/inertia`](https://github.com/honojs/middleware/tree/main/packages/inertia)) and [`@adwd/inertia-preact`](../../packages/preact) on the client.

It follows the RealWorld [routes, templates and styles](https://docs.realworld.show/specifications/frontend/routing/), and keeps what makes Inertia apps simple: the server is in charge, there is no API.

## Running it

```bash
pnpm install
pnpm --filter @adwd/inertia-preact build   # the adapter, from the repository root
cd examples/conduit
pnpm dev                                   # http://localhost:5173
```

Sign in as `jake@example.com` (or `ada`, `grace`, `linus`, `margaret` at `example.com`) with the password `password123`, or sign up. The data is kept in memory, and seeded on start: set `DATABASE` to a file path to keep it.

```bash
pnpm build && pnpm start   # the production build, http://localhost:3000
pnpm test:e2e              # Playwright tests, against the production build
```

Node 22.18 or later is needed (for `node:sqlite`, and running TypeScript files).

## The server is in charge

- **Routing**: the Hono routes (`server/app.ts`) decide which page to show, with `c.render('Article', props)`. There is no client-side router.
- **Data**: every page gets its data as props, loaded from SQLite by the route. There is no API to design for the frontend, and no data fetching in components.
- **Authorization**: the server decides what the user may do, and sends it with the data (`article.can.edit`, `comment.can.delete`). Pages only show what they're told.
- **Validation**: forms post to the server, which validates them and redirects back with the errors (kept in the session for the next request), like any server-rendered app. `useForm` shows them.
- **Authentication**: a session cookie (`HttpOnly`, `SameSite=Lax`), not a token in the browser. Forms from other sites are rejected (`hono/csrf`).
- **Markdown** is rendered to HTML by the server, which drops raw HTML and unsafe links.
- **Server-side rendering**: the first page arrives as HTML, rendered by the same process with `preact-render-to-string`, then hydrated.

Inertia turns the links and forms into requests for the next page, and the client only renders pages. A few of its features keep it snappy:

- **Partial reloads**: switching feeds or pages reloads the articles only (`only: ['tab', 'articles']`), and after a comment, only the comments.
- **Deferred props**: the popular tags load after the home page is shown.
- **Optimistic updates**: favoriting and following show the result right away, and roll back if the server refuses.
- **Prefetching**: article links load the article on hover.

## Layout

```
server/
  app.ts          routes: the pages, forms and actions
  inertia.ts      the Inertia middleware: shared props, and the HTML document with SSR
  session.ts      sessions and flash data
  db.ts           the SQLite schema and queries
  seed.ts         demo content
  markdown.ts     Markdown rendering
  dev.ts          the development server (Vite with the Hono app)
  main.ts         the production server
src/
  pages/          one component per page, getting its props from the server
  components/     the layout, article list, buttons...
  client.tsx      the client entry
  ssr.tsx         server-side rendering
public/           the RealWorld theme (styles.css) and default avatar
tests/            Playwright tests, using the RealWorld selectors
```

The theme and the default avatar come from the RealWorld repository (MIT).
