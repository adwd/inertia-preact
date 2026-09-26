import { usePage } from '@adwd/inertia-preact'
import type { ComponentChildren } from 'preact'
import { useId, useState } from 'preact/hooks'

export default ({ children }: { children: ComponentChildren }) => {
  const [createdAt] = useState(Date.now())

  window._inertia_nested_layout_id = useId()
  window._inertia_nested_layout_props = usePage().props

  return (
    <div>
      <span>Nested Layout</span>
      <span>{createdAt}</span>
      <div>{children}</div>
    </div>
  )
}
