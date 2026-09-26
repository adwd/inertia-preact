import { createLayoutPropsStore, type LayoutProps, type NamedLayoutProps } from '@inertiajs/core'

export const layoutPropsStore = createLayoutPropsStore()

/**
 * Sets props on the page's layouts from within the page. With a name, only the named layout receives them.
 * They're reset on every visit that doesn't preserve state.
 */
export function setLayoutProps(props: Partial<LayoutProps>): void
export function setLayoutProps<K extends keyof NamedLayoutProps>(name: K, props: Partial<NamedLayoutProps[K]>): void
export function setLayoutProps<T = never>(props: Partial<NoInfer<T>>): void
export function setLayoutProps<T = never>(name: string, props: Partial<NoInfer<T>>): void
export function setLayoutProps(nameOrProps: string | Record<string, unknown>, props?: Record<string, unknown>): void {
  if (typeof nameOrProps === 'string') {
    layoutPropsStore.setFor(nameOrProps, props!)
  } else {
    layoutPropsStore.set(nameOrProps)
  }
}

export function resetLayoutProps(): void {
  layoutPropsStore.reset()
}
