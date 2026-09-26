import type { ComponentChildren } from 'preact'

export default function SSRLayout({
  title = 'Default Title',
  children,
}: {
  title?: string
  children: ComponentChildren
}) {
  return (
    <div class="ssr-layout">
      <h1 data-testid="layout-title">{title}</h1>
      {children}
    </div>
  )
}
