import type { ComponentChildren } from 'preact'
import { useContext, useLayoutEffect, useMemo } from 'preact/hooks'
import { AppContext, PageContext } from './context'
import { renderHeadElements } from './renderHead'

export interface HeadProps {
  /** The page title. A `<title>` among the children takes precedence. */
  title?: string
  /** Elements to add to `<head>`. Give them a `head-key` to replace an element with the same key on other pages. */
  children?: ComponentChildren
}

/** Manages elements in the document `<head>`, including during SSR. Renders nothing itself. */
export default function Head({ title, children }: HeadProps) {
  const app = useContext(AppContext)

  if (!app) {
    throw new Error('<Head> must be used within an Inertia app')
  }

  const provider = useMemo(() => app.headManager.createProvider(), [app])
  const elements = renderHeadElements(children, title)
  // The title callback may depend on the page, so the head is refreshed when the page changes too
  const page = useContext(PageContext)

  if (typeof window === 'undefined') {
    provider.update(elements)
  }

  // A layout effect, so on a visit the new page's head is registered in the same commit that unregisters the
  // old page's (on unmount). With an effect, which runs after paint, the head manager could briefly render
  // the head without either.
  useLayoutEffect(() => {
    provider.reconnect()
    provider.update(elements)

    return () => provider.disconnect()
  }, [provider, elements.join(''), page])

  return null
}
