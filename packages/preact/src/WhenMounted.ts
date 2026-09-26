import type { ComponentChildren } from 'preact'
import { useContext, useEffect, useState } from 'preact/hooks'
import { AppContext } from './context'

export interface WhenMountedProps {
  children: ComponentChildren | (() => ComponentChildren)
  /** Rendered on the server and while hydrating. */
  fallback?: ComponentChildren | (() => ComponentChildren)
}

/**
 * Renders its children only in the browser, e.g. for content that depends on browser APIs. With SSR, the
 * fallback is rendered on the server and during hydration, so the markup matches. Anywhere else (a page
 * rendered in the browser, remounts, visits) the children render right away.
 */
export default function WhenMounted({ children, fallback = null }: WhenMountedProps) {
  const app = useContext(AppContext)
  const [mounted, setMounted] = useState(() => app?.hydrated ?? false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return typeof fallback === 'function' ? fallback() : fallback
  }

  return typeof children === 'function' ? children() : children
}
