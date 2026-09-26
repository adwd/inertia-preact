import { usePage } from 'inertia-preact'
import type { ComponentChildren } from 'preact'
import { useId, useState } from 'preact/hooks'

export default function FnSiteLayout({ children }: { children: ComponentChildren }) {
  const [createdAt] = useState(Date.now())

  window._inertia_layout_id = useId()
  window._inertia_site_layout_props = usePage().props

  return (
    <div>
      <span>Site Layout</span>
      <span>{createdAt}</span>
      <div>{children}</div>
    </div>
  )
}
