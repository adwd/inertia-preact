import { type ReloadOptions, router } from '@inertiajs/core'
import { get } from 'es-toolkit/compat'
import { type ComponentChildren, h } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import usePage from './usePage'

export interface WhenVisibleProps {
  /** The prop(s) to load when the element becomes visible. Dot notation is supported for nested props. */
  data?: string | string[]
  /** Options for the reload, e.g. to load other props. */
  params?: ReloadOptions
  /** Rendered until the props are loaded. */
  fallback: ComponentChildren | (() => ComponentChildren)
  /** Rendered once the props are loaded. As a function, it also receives whether they are being fetched. */
  children: ComponentChildren | ((props: { fetching: boolean }) => ComponentChildren)
  /** How far (in pixels) before it scrolls into view the props start loading. */
  buffer?: number
  /** The element to render around the content while it is observed. Defaults to `div`. */
  as?: string
  /** Reload every time the element becomes visible, not just the first time. */
  always?: boolean
}

/** Loads props with a partial reload once the element scrolls into view. */
export default function WhenVisible({
  data,
  params,
  fallback,
  children,
  buffer = 0,
  as = 'div',
  always = false,
}: WhenVisibleProps) {
  const keys = data ? (Array.isArray(data) ? data : [data]) : []
  const pageProps = usePage().props
  const propsLoaded = keys.length > 0 && keys.every((key) => get(pageProps, key) !== undefined)

  const [loaded, setLoaded] = useState(propsLoaded)
  const [fetching, setFetching] = useState(false)
  const element = useRef<HTMLElement>(null)

  // The observer outlives renders, so it reads the latest values through a ref
  const latest = useRef({ keys, params, always, loaded, fetching: false })
  latest.current = { ...latest.current, keys, params, always, loaded }

  // Props loaded by other means (e.g. navigating back) count as loaded too
  useEffect(() => {
    if (keys.length > 0) {
      setLoaded(propsLoaded)
    }
  }, [propsLoaded])

  useEffect(() => {
    if (!element.current || (loaded && !always)) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const { keys, params, always, loaded, fetching } = latest.current

        if (!entry.isIntersecting || fetching || (loaded && !always)) {
          return
        }

        const reloadOptions: ReloadOptions = {
          preserveErrors: true,
          ...params,
          ...(keys.length > 0 ? { only: keys } : {}),
        }

        latest.current.fetching = true
        setFetching(true)

        router.reload({
          ...reloadOptions,
          onStart: (event) => {
            latest.current.fetching = true
            setFetching(true)
            reloadOptions.onStart?.(event)
          },
          onFinish: (event) => {
            latest.current.fetching = false
            setFetching(false)
            setLoaded(true)
            reloadOptions.onFinish?.(event)

            if (!latest.current.always) {
              observer.disconnect()
            }
          },
        })
      },
      { rootMargin: `${buffer}px` },
    )

    observer.observe(element.current)

    return () => observer.disconnect()
  }, [loaded, always, buffer])

  const content = () => (typeof children === 'function' ? children({ fetching }) : children)

  if (loaded && !always) {
    return content()
  }

  return h(as, { ref: element }, loaded ? content() : typeof fallback === 'function' ? fallback() : fallback)
}
