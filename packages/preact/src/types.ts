import type { LayoutCallbackReturn, PageHandler, SharedPageProps } from '@inertiajs/core'
import type { ComponentChildren, ComponentType } from 'preact'

/** A layout component: receives the page as `children`, plus any layout props. */
export type LayoutComponent = ComponentType<any>

/** A function that wraps the rendered page, e.g. `(page) => <AppLayout>{page}</AppLayout>`. */
export type LayoutFunction = (page: ComponentChildren) => ComponentChildren

/** A function that derives the layout (and/or its props) from the page props. */
export type LayoutCallback = (props: SharedPageProps) => LayoutCallbackReturn<ComponentType<any>>

/**
 * A page component as returned by `resolve`. The optional static `layout` property accepts every layout
 * definition Inertia supports: a component, an array of (nested) components, `[Component, props]`, named
 * layouts, props for the default layout, a render function, or a callback receiving the page props.
 */
export type PageComponent = ComponentType<any> & {
  layout?: unknown
}

export type PageHandlerArgs = Parameters<PageHandler<PageComponent>>[0]
