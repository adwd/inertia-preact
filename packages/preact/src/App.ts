import {
  createHeadManager,
  type HeadManagerOnUpdateCallback,
  type HeadManagerTitleCallback,
  isPropsObject,
  isPropsObjectOrCallback,
  normalizeLayouts,
  type Page,
  type PageProps,
  resolveServerHead,
  router,
  type ServerHeadOption,
} from '@inertiajs/core'
import { Component, type ComponentChildren, type ComponentType, h, isValidElement } from 'preact'
import { AppContext, type AppState, PageContext } from './context'
import { layoutPropsStore, resetLayoutProps } from './layoutProps'
import type { LayoutFunction, PageComponent, PageHandlerArgs } from './types'

export interface InertiaAppProps<SharedProps extends PageProps = PageProps> {
  initialPage: Page<SharedProps>
  initialComponent: PageComponent
  resolveComponent: (name: string, page?: Page) => PageComponent | Promise<PageComponent>
  titleCallback?: HeadManagerTitleCallback
  onHeadUpdate?: HeadManagerOnUpdateCallback
  defaultLayout?: (name: string, page: Page) => unknown
  serverHead?: ServerHeadOption
  /** Whether the app is hydrating server-rendered markup. Set by `createInertiaApp`. */
  serverRendered?: boolean
}

interface InertiaAppState {
  component: PageComponent
  page: Page
  /** Changes on every visit that doesn't preserve state, so the page component remounts. */
  key: number | null
}

type LayoutPropsSnapshot = ReturnType<typeof layoutPropsStore.get>

const isServer = typeof window === 'undefined'
const emptyLayoutProps: LayoutPropsSnapshot = { shared: {}, named: {} }

// The router is a singleton, so it is initialized once and talks to whichever app is mounted
let routerInitialized = false
let mountedApp: App | null = null
let queuedSwaps: Array<{ args: PageHandlerArgs; resolve: () => void }> = []
let queuedFlash: Page['flash'] | null = null
let pageKey = 0

function swapComponent(args: PageHandlerArgs): Promise<void> {
  if (args.initialRender) {
    // The initial page is already rendered
    return Promise.resolve()
  }

  if (mountedApp) {
    return mountedApp.swap(args)
  }

  // The router can swap before the app has mounted (e.g. a back_forward visit restoring a page from history)
  return new Promise((resolve) => queuedSwaps.push({ args, resolve }))
}

function isComponent(value: unknown): value is PageComponent {
  return typeof value === 'function'
}

// An arrow function (no prototype) taking the page: `(page) => <Layout>{page}</Layout>`
function isRenderFunction(value: unknown): boolean {
  return typeof value === 'function' && value.length === 1 && value.prototype === undefined
}

// An arrow function that returns a layout definition or layout props: `(props) => [Layout, { title }]`
function isLayoutCallback(value: unknown): boolean {
  return typeof value === 'function' && value.length <= 1 && value.prototype === undefined
}

function renderPage(
  Page: PageComponent,
  page: Page,
  key: number | null,
  defaultLayout: InertiaAppProps['defaultLayout'],
  layoutProps: LayoutPropsSnapshot,
): ComponentChildren {
  const props = page.props
  const child = h(Page, { key, ...props })
  const layout = Page.layout

  let effectiveLayout: unknown
  let callbackProps: Record<string, unknown> | null = null

  if (isLayoutCallback(layout)) {
    const result = (layout as (props: PageProps) => unknown)(props)

    if (isValidElement(result)) {
      // A render function rather than a callback: it wraps the page itself
      return (layout as LayoutFunction)(child)
    }

    if (isPropsObjectOrCallback(result, isComponent)) {
      effectiveLayout = defaultLayout?.(page.component, page)
      callbackProps = result as Record<string, unknown>
    } else {
      effectiveLayout = result
    }
  } else if (isPropsObject(layout, isComponent)) {
    // Props for the default layout
    effectiveLayout = defaultLayout?.(page.component, page)
    callbackProps = layout as Record<string, unknown>
  } else {
    effectiveLayout = layout ?? defaultLayout?.(page.component, page)
  }

  const layouts = normalizeLayouts(
    effectiveLayout,
    isComponent,
    layout && !callbackProps ? isRenderFunction : undefined,
  )

  return layouts.reduceRight<ComponentChildren>(
    (children, { component, props: definitionProps, name }) =>
      h(
        component as ComponentType<any>,
        {
          ...props,
          ...definitionProps,
          ...callbackProps,
          ...layoutProps.shared,
          ...(name ? layoutProps.named[name] : undefined),
        },
        children,
      ),
    child,
  )
}

/**
 * The root component of an Inertia app. It renders the current page (wrapped in its layouts), provides the
 * page to `usePage()`, and swaps pages when the router navigates.
 */
export default class App extends Component<InertiaAppProps, InertiaAppState> {
  static override displayName = 'Inertia'

  private readonly app: AppState
  private readonly pendingSwaps = new Set<() => void>()
  private readonly cleanups: Array<() => void> = []

  constructor(props: InertiaAppProps) {
    super(props)

    const { initialPage, initialComponent, serverRendered = false } = props

    this.state = {
      component: initialComponent,
      page: { ...initialPage, flash: initialPage.flash ?? {} },
      key: null,
    }

    this.app = {
      headManager: createHeadManager(
        isServer,
        (title) => (props.titleCallback ? props.titleCallback(title, this.state.page) : title),
        props.onHeadUpdate ?? (() => {}),
        resolveServerHead(initialPage, props.serverHead),
      ),
      hydrated: !isServer && !serverRendered,
    }

    if (!isServer && !routerInitialized) {
      routerInitialized = true

      // Initialized before the first render (rather than on mount) so components can
      // use the router, e.g. `router.reload()`, as soon as they mount.
      router.init<PageComponent>({
        initialPage,
        resolveComponent: props.resolveComponent,
        swapComponent,
        onFlash: (flash) => {
          if (mountedApp) {
            mountedApp.setFlash(flash)
          } else {
            queuedFlash = flash
          }
        },
      })
    }
  }

  override componentDidMount(): void {
    // oxlint-disable-next-line no-this-alias -- the router talks to the mounted app through this reference
    mountedApp = this

    const wasHydrating = !this.app.hydrated
    this.app.hydrated = true

    this.cleanups.push(layoutPropsStore.subscribe(() => this.forceUpdate()))

    // Layout props are left out while hydrating so the markup matches the server's, so apply them now
    const { shared, named } = layoutPropsStore.get()

    if (wasHydrating && (Object.keys(shared).length > 0 || Object.keys(named).length > 0)) {
      this.forceUpdate()
    }

    const syncServerHead = (event: { detail: { page: Page } }) => {
      this.app.headManager.updateServerHead(resolveServerHead(event.detail.page, this.props.serverHead))
    }

    this.cleanups.push(router.on('navigate', syncServerHead), router.on('clientVisit', syncServerHead))

    const swaps = queuedSwaps
    queuedSwaps = []
    swaps.forEach(({ args, resolve }) => this.swap(args).then(resolve))

    if (queuedFlash) {
      this.setFlash(queuedFlash)
      queuedFlash = null
    }
  }

  override componentWillUnmount(): void {
    if (mountedApp === this) {
      mountedApp = null
    }

    this.cleanups.splice(0).forEach((cleanup) => cleanup())

    // Nothing will be rendered anymore, so don't leave the router waiting
    this.pendingSwaps.forEach((resolve) => resolve())
    this.pendingSwaps.clear()
  }

  /**
   * Renders the given page. Resolves once the page is committed to the DOM: the router awaits this before
   * restoring scroll positions and firing events, and Preact calls `setState` callbacks after the commit.
   */
  swap({ component, page, preserveState }: PageHandlerArgs): Promise<void> {
    if (!preserveState) {
      resetLayoutProps()
    }

    return new Promise((resolve) => {
      const done = () => {
        this.pendingSwaps.delete(done)
        resolve()
      }

      this.pendingSwaps.add(done)
      this.setState(({ key }) => ({ component, page, key: preserveState ? key : ++pageKey }), done)
    })
  }

  setFlash(flash: Page['flash']): void {
    this.setState(({ page }) => ({ page: { ...page, flash } }))
  }

  override render() {
    const { component, page, key } = this.state
    const layoutProps = this.app.hydrated ? layoutPropsStore.get() : emptyLayoutProps

    return h(
      AppContext.Provider,
      { value: this.app },
      h(PageContext.Provider, { value: page }, renderPage(component, page, key, this.props.defaultLayout, layoutProps)),
    )
  }
}
