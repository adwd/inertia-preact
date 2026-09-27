import { router, type VisitOptions } from '@inertiajs/core'
import { useEffect, useState } from 'preact/hooks'

/** The prefetch state of the current page, e.g. to show whether it is served from the prefetch cache. */
export default function usePrefetch(options: VisitOptions = {}): {
  lastUpdatedAt: number | null
  isPrefetching: boolean
  isPrefetched: boolean
  flush: () => void
} {
  const [state, setState] = useState(() => {
    const isServer = typeof window === 'undefined'
    const cached = isServer ? null : router.getCached(window.location.pathname, options)
    const inFlight = isServer ? null : router.getPrefetching(window.location.pathname, options)

    return {
      lastUpdatedAt: cached?.staleTimestamp ?? null,
      isPrefetching: inFlight !== null,
      isPrefetched: cached !== null,
    }
  })

  useEffect(() => {
    function isCurrentPage(url: URL) {
      return url.pathname === window.location.pathname
    }

    const removePrefetchingListener = router.on('prefetching', ({ detail }) => {
      if (isCurrentPage(detail.visit.url)) {
        setState((state) => ({ ...state, isPrefetching: true }))
      }
    })

    const removePrefetchedListener = router.on('prefetched', ({ detail }) => {
      if (isCurrentPage(detail.visit.url)) {
        setState({ lastUpdatedAt: detail.fetchedAt, isPrefetching: false, isPrefetched: true })
      }
    })

    return () => {
      removePrefetchingListener()
      removePrefetchedListener()
    }
  }, [])

  return {
    ...state,
    flush: () => router.flush(window.location.pathname, options),
  }
}
