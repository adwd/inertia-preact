import { router } from '@inertiajs/core'
import { type Dispatch, type StateUpdater, useEffect, useState } from 'preact/hooks'

/**
 * Like `useState`, but the state is kept in the history state, so it is restored when navigating back
 * to the page. Use a unique `key` when a page has more than one remembered state.
 */
export default function useRemember<State>(
  initialState: State | (() => State),
  key?: string,
): [State, Dispatch<StateUpdater<State>>] {
  const [state, setState] = useState<State>(() => {
    const restored = typeof window === 'undefined' ? undefined : (router.restore(key) as State | undefined)

    if (restored !== undefined) {
      return restored
    }

    return typeof initialState === 'function' ? (initialState as () => State)() : initialState
  })

  useEffect(() => {
    router.remember(state, key)
  }, [state, key])

  return [state, setState]
}
