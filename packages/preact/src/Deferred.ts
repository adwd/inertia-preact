import { isSameUrlWithoutQueryOrHash, partialReloadRequestsSomeProps, router } from '@inertiajs/core'
import { get } from 'es-toolkit/compat'
import type { ComponentChildren } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import usePage from './usePage'

export interface DeferredProps {
  /** The deferred prop(s) to wait for. Dot notation is supported for nested props. */
  data: string | string[]
  /** Rendered while the props are loading. */
  fallback: ComponentChildren | (() => ComponentChildren)
  /** Rendered once the props are loaded. As a function, it also receives whether they are being reloaded. */
  children: ComponentChildren | ((props: { reloading: boolean }) => ComponentChildren)
  /** Rendered instead of the children when the server failed to resolve one of the props. */
  rescue?: ComponentChildren | ((props: { reloading: boolean }) => ComponentChildren)
}

/** Renders a fallback until the given deferred props are loaded. */
export default function Deferred({ data, fallback, children, rescue }: DeferredProps): ComponentChildren {
  if (!data) {
    throw new Error('`<Deferred>` requires a `data` prop to be a string or array of strings')
  }

  if (!fallback) {
    throw new Error('`<Deferred>` requires a `fallback` prop')
  }

  const keys = Array.isArray(data) ? data : [data]
  const page = usePage()
  const [reloading, setReloading] = useState(false)

  // Partial reloads of the props (e.g. `router.reload({ only: [...] })`) set `reloading`
  useEffect(() => {
    const activeReloads = new Set<object>()

    const removeStartListener = router.on('start', ({ detail: { visit } }) => {
      if (
        visit.preserveState === true &&
        isSameUrlWithoutQueryOrHash(visit.url, window.location) &&
        partialReloadRequestsSomeProps(visit, keys)
      ) {
        activeReloads.add(visit)
        setReloading(true)
      }
    })

    const removeFinishListener = router.on('finish', ({ detail: { visit } }) => {
      if (activeReloads.delete(visit)) {
        setReloading(activeReloads.size > 0)
      }
    })

    return () => {
      removeStartListener()
      removeFinishListener()
    }
  }, [keys.join()])

  const rescued = keys.some((key) => page.rescuedProps?.includes(key))
  const loaded = keys.every((key) => get(page.props, key) !== undefined)

  if (loaded && !rescued) {
    return typeof children === 'function' ? children({ reloading }) : children
  }

  if (rescued && rescue) {
    return typeof rescue === 'function' ? rescue({ reloading }) : rescue
  }

  return typeof fallback === 'function' ? fallback() : fallback
}
