import type { ComponentChildren } from 'preact'
import { useId } from 'preact/hooks'

export default function ContentLayout({
  padding = 'md',
  maxWidth = 'lg',
  children,
}: {
  padding?: string
  maxWidth?: string
  children: ComponentChildren
}) {
  const layoutId = useId()
  window._inertia_content_layout_id = layoutId

  return (
    <div class="content-layout" data-padding={padding} data-max-width={maxWidth}>
      <div class="content-wrapper">{children}</div>
    </div>
  )
}
