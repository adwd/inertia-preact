import {
  buildSSRBody,
  config,
  type CreateInertiaAppOptions,
  type CreateInertiaAppOptionsForCSR,
  type CreateInertiaAppOptionsForSSR,
  exposeInterceptors,
  getInitialPageFromDOM,
  http as httpModule,
  type InertiaAppSSRResponse,
  type Page,
  type PageProps,
  router,
  setupProgress,
  type SharedPageProps,
} from '@inertiajs/core'
import { h, hydrate, render, type VNode } from 'preact'
import App, { type InertiaAppProps } from './App'
import type { PageComponent } from './types'

export interface SetupOptions<ElementType, SharedProps extends PageProps> {
  el: ElementType
  App: typeof App
  props: InertiaAppProps<SharedProps>
}

type ComponentResolver = (
  name: string,
  page?: Page<SharedPageProps>,
) => PageComponent | { default: PageComponent } | Promise<PageComponent | { default: PageComponent }>

/** Renders a vnode to HTML, e.g. `renderToString` from `preact-render-to-string`. */
export type RenderToString = (vnode: VNode<any>) => string

/** Wraps the app, e.g. in context providers. Used when there is no `setup`, on the client and the server. */
type WithApp<SharedProps extends PageProps> = (
  app: VNode<any>,
  options: { ssr: boolean; page: Page<SharedProps> },
) => VNode<any>

// Client: renders into the element, or hands off to `setup`
type ClientOptions<SharedProps extends PageProps> = CreateInertiaAppOptionsForCSR<
  SharedProps,
  ComponentResolver,
  SetupOptions<HTMLElement, SharedProps>,
  void,
  object
> & { withApp?: never }

// Server: renders the given page with `render` and returns the head and body. `setup` is optional here,
// without it the app is rendered as is (or wrapped by `withApp`).
type ServerOptions<SharedProps extends PageProps> = Omit<
  CreateInertiaAppOptionsForSSR<SharedProps, ComponentResolver, SetupOptions<null, SharedProps>, VNode<any>, object>,
  'setup'
> & { render: RenderToString } & (
    | { setup?: undefined; withApp?: WithApp<SharedProps> }
    | { setup: (options: SetupOptions<null, SharedProps>) => VNode<any>; withApp?: never }
  )

// Both: the same entry on the client and the server. On the server (without `page`) it returns a render
// function, which is what the `@inertiajs/vite` SSR transform expects.
type UniversalOptions<SharedProps extends PageProps> = Omit<
  CreateInertiaAppOptions<ComponentResolver, SetupOptions<HTMLElement | null, SharedProps>, VNode<any> | void, object>,
  'setup'
> & {
  page?: Page<SharedProps>
  render?: undefined
} & (
    | { setup?: undefined; withApp?: WithApp<SharedProps> }
    | { setup: (options: SetupOptions<HTMLElement | null, SharedProps>) => VNode<any> | void; withApp?: never }
  )

export type RenderPage<SharedProps extends PageProps> = (
  page: Page<SharedProps>,
  renderToString: RenderToString,
) => Promise<InertiaAppSSRResponse>

export default async function createInertiaApp<SharedProps extends PageProps = PageProps & SharedPageProps>(
  options: ClientOptions<SharedProps>,
): Promise<void>
export default async function createInertiaApp<SharedProps extends PageProps = PageProps & SharedPageProps>(
  options: ServerOptions<SharedProps>,
): Promise<InertiaAppSSRResponse>
export default async function createInertiaApp<SharedProps extends PageProps = PageProps & SharedPageProps>(
  options?: UniversalOptions<SharedProps>,
): Promise<void | RenderPage<SharedProps>>
export default async function createInertiaApp<SharedProps extends PageProps = PageProps & SharedPageProps>({
  id = 'app',
  resolve,
  setup,
  title,
  progress = {},
  page,
  render: renderToString,
  defaults = {},
  nonce,
  http,
  layout,
  serverHead,
  withApp,
  dev = !!import.meta.env?.DEV,
}: ClientOptions<SharedProps> | ServerOptions<SharedProps> | UniversalOptions<SharedProps> = {}): Promise<
  InertiaAppSSRResponse | RenderPage<SharedProps> | void
> {
  config.replace(defaults)

  if (nonce) {
    config.set('nonce', nonce)
  }

  if (http) {
    httpModule.setClient(http)
  }

  if (dev) {
    exposeInterceptors()
  }

  const isServer = typeof window === 'undefined'

  const resolveComponent = async (name: string, page?: Page): Promise<PageComponent> => {
    const module = await resolve!(name, page)

    return (module as { default?: PageComponent }).default ?? (module as PageComponent)
  }

  const appProps = (initialPage: Page<SharedProps>, initialComponent: PageComponent, serverRendered: boolean) =>
    ({
      initialPage,
      initialComponent,
      resolveComponent,
      titleCallback: title,
      defaultLayout: layout,
      serverHead,
      serverRendered,
    }) satisfies InertiaAppProps<SharedProps>

  const renderOnServer = async (page: Page<SharedProps>, renderToString: RenderToString) => {
    let head: string[] = []

    const props: InertiaAppProps<SharedProps> = {
      ...appProps(page, await resolveComponent(page.component, page), true),
      onHeadUpdate: (elements) => (head = elements),
    }

    const app = setup
      ? (setup as (options: SetupOptions<null, SharedProps>) => VNode<any>)({ el: null, App, props })
      : (withApp ?? ((app) => app))(h(App, props), { ssr: true, page })

    const body = buildSSRBody(id, page, renderToString(app))

    return { head, body }
  }

  if (isServer) {
    // Without a page, return a render function for the SSR server (see `@inertiajs/vite`)
    return page ? renderOnServer(page, renderToString!) : renderOnServer
  }

  const initialPage = page ?? getInitialPageFromDOM<Page<SharedProps>>(id)!

  const [initialComponent] = await Promise.all([
    resolveComponent(initialPage.component, initialPage),
    router.decryptHistory().catch(() => {}),
  ])

  const el = document.getElementById(id)!
  const serverRendered = el.hasAttribute('data-server-rendered')
  const props = appProps(initialPage, initialComponent, serverRendered)

  if (setup) {
    ;(setup as (options: SetupOptions<HTMLElement, SharedProps>) => void)({ el, App, props })
  } else {
    const app = (withApp ?? ((app) => app))(h(App, props), { ssr: false, page: initialPage })

    if (serverRendered) {
      hydrate(app, el)
    } else {
      render(app, el)
    }
  }

  if (progress) {
    setupProgress(progress)
  }
}
