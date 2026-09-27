import { useEffect, useState } from 'preact/hooks'

export interface Store<TSnapshot> {
  /** Increases on every change. */
  readonly version: number
  subscribe(listener: () => void): () => void
  getSnapshot(): TSnapshot
}

/**
 * Creates a store once per component instance, re-renders the component when it changes, and returns
 * its current snapshot.
 */
export function useStore<TSnapshot>(create: () => Store<TSnapshot>): TSnapshot {
  const [store] = useState(create)
  const [, setRenderCount] = useState(0)
  const renderedVersion = store.version

  useEffect(() => {
    function rerender() {
      setRenderCount((count) => count + 1)
    }
    const unsubscribe = store.subscribe(rerender)

    // The store may have changed between rendering and subscribing
    if (store.version !== renderedVersion) {
      rerender()
    }

    return unsubscribe
  }, [store])

  return store.getSnapshot()
}
