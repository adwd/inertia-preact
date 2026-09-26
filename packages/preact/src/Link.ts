import {
  config,
  isUrlMethodPair,
  type LinkComponentBaseProps,
  type LinkPrefetchOption,
  mergeDataIntoQueryString,
  type Method,
  resolveUrlMethodPairComponent,
  router,
  shouldIntercept,
  shouldNavigate,
  type VisitOptions,
} from '@inertiajs/core'
import {
  type AllHTMLAttributes,
  type ComponentType,
  h,
  type TargetedKeyboardEvent,
  type TargetedMouseEvent,
} from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'

export type LinkProps = LinkComponentBaseProps & {
  /** The element or component to render. Defaults to `a`, or `button` for methods other than GET. */
  as?: string | ComponentType<any>
  onClick?: (event: TargetedMouseEvent<HTMLElement>) => void
} & Omit<AllHTMLAttributes<HTMLElement>, keyof LinkComponentBaseProps | 'as' | 'onClick' | 'ref'>

const noop = () => {}

function prefetchModesOf(prefetch: LinkComponentBaseProps['prefetch']): LinkPrefetchOption[] {
  if (prefetch === true) {
    return ['hover']
  }

  if (!prefetch) {
    return []
  }

  return Array.isArray(prefetch) ? prefetch : [prefetch]
}

/**
 * Navigates with an Inertia visit instead of a full page load. Renders an `<a>` by default, and a
 * `<button>` for methods other than GET. While a visit it started is in flight, it has `data-loading`.
 */
export default function Link({
  children,
  as = 'a',
  data = {},
  href = '',
  method = 'get',
  preserveScroll = false,
  preserveState,
  preserveUrl = false,
  replace = false,
  only = [],
  except = [],
  headers = {},
  queryStringArrayFormat = 'brackets',
  async = false,
  onClick = noop,
  onCancelToken = noop,
  onBefore = noop,
  onStart = noop,
  onProgress = noop,
  onFinish = noop,
  onCancel = noop,
  onSuccess = noop,
  onError = noop,
  onHttpException = noop,
  onNetworkError = noop,
  onFlash = noop,
  onPrefetching = noop,
  onPrefetched = noop,
  prefetch = false,
  cacheFor = 0,
  cacheTags = [],
  viewTransition = false,
  component = null,
  instant = false,
  pageProps = null,
  ...props
}: LinkProps) {
  const [inFlightCount, setInFlightCount] = useState(0)
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const resolvedMethod: Method = isUrlMethodPair(href) ? href.method : (method.toLowerCase() as Method)
  const isAnchor = typeof as === 'string' && as.toLowerCase() === 'a'
  const element = isAnchor ? (resolvedMethod === 'get' ? 'a' : 'button') : as

  const [url, mergedData] = mergeDataIntoQueryString(
    resolvedMethod,
    isUrlMethodPair(href) ? href.url : href,
    data,
    queryStringArrayFormat,
  )

  const baseOptions: VisitOptions = {
    data: mergedData,
    method: resolvedMethod,
    preserveScroll,
    preserveState: preserveState ?? resolvedMethod !== 'get',
    preserveUrl,
    replace,
    only,
    except,
    headers,
    async,
    component: component ?? (instant && isUrlMethodPair(href) ? resolveUrlMethodPairComponent(href) : null),
    pageProps,
  }

  const visit = () =>
    router.visit(url, {
      ...baseOptions,
      viewTransition,
      onCancelToken,
      onBefore,
      onStart(visit) {
        setInFlightCount((count) => count + 1)
        onStart(visit)
      },
      onProgress,
      onFinish(visit) {
        setInFlightCount((count) => count - 1)
        onFinish(visit)
      },
      onCancel,
      onSuccess,
      onError,
      onHttpException,
      onNetworkError,
      onFlash,
    })

  const prefetchModes = prefetchModesOf(prefetch)

  const cacheForValue =
    cacheFor !== 0
      ? cacheFor
      : prefetchModes.length === 1 && prefetchModes[0] === 'click'
        ? // Prefetching on click only serves the upcoming visit, so don't keep the response around
          0
        : config.get('prefetch.cacheFor')

  const doPrefetch = () =>
    router.prefetch(url, { ...baseOptions, onPrefetching, onPrefetched }, { cacheFor: cacheForValue, cacheTags })

  // Latest prefetch function for the mount prefetch, which runs once
  const prefetchRef = useRef(doPrefetch)
  prefetchRef.current = doPrefetch

  useEffect(() => {
    if (prefetchModes.includes('mount')) {
      setTimeout(() => prefetchRef.current())
    }

    return () => clearTimeout(hoverTimeout.current)
  }, [])

  const handleClick = (event: TargetedMouseEvent<HTMLElement>) => {
    onClick(event)

    if (shouldIntercept(event)) {
      event.preventDefault()
      visit()
    }
  }

  let events: Record<string, (event: any) => void>

  if (prefetchModes.includes('hover')) {
    events = {
      onMouseEnter: () => {
        hoverTimeout.current = setTimeout(doPrefetch, config.get('prefetch.hoverDelay'))
      },
      onMouseLeave: () => clearTimeout(hoverTimeout.current),
      onClick: (event: TargetedMouseEvent<HTMLElement>) => {
        clearTimeout(hoverTimeout.current)
        handleClick(event)
      },
    }
  } else if (prefetchModes.includes('click')) {
    // Prefetch on press and visit on release, which is when the prefetched response is most likely ready
    events = {
      onMouseDown: (event: TargetedMouseEvent<HTMLElement>) => {
        if (shouldIntercept(event)) {
          event.preventDefault()
          doPrefetch()
        }
      },
      onKeyDown: (event: TargetedKeyboardEvent<HTMLElement>) => {
        if (shouldNavigate(event)) {
          event.preventDefault()
          doPrefetch()
        }
      },
      onMouseUp: (event: TargetedMouseEvent<HTMLElement>) => {
        if (shouldIntercept(event)) {
          event.preventDefault()
          visit()
        }
      },
      onKeyUp: (event: TargetedKeyboardEvent<HTMLElement>) => {
        if (shouldNavigate(event)) {
          event.preventDefault()
          visit()
        }
      },
      onClick: (event: TargetedMouseEvent<HTMLElement>) => {
        onClick(event)

        if (shouldIntercept(event)) {
          // The mouseup/keyup handlers make the visit
          event.preventDefault()
        }
      },
    }
  } else {
    events = { onClick: handleClick }
  }

  const elementProps =
    element === 'button' ? { type: 'button' } : element === 'a' || typeof element !== 'string' ? { href: url } : {}

  return h(
    element as string,
    {
      ...props,
      ...elementProps,
      ...events,
      'data-loading': inFlightCount > 0 ? '' : undefined,
    },
    children,
  )
}
