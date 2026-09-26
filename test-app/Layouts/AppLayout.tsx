import type { ComponentChildren } from 'preact'
import { useId } from 'preact/hooks'

export default function AppLayout({
  title = 'Default Title',
  showSidebar = true,
  theme = 'light',
  formatTitle,
  children,
}: {
  title?: string
  showSidebar?: boolean
  theme?: string
  formatTitle?: (name: string) => string
  children: ComponentChildren
}) {
  const layoutId = useId()
  window._inertia_app_layout_id = layoutId

  return (
    <div data-theme={theme} class="app-layout">
      <header>
        <h1 class="app-title">{formatTitle ? formatTitle('User') : title}</h1>
      </header>
      <div class="app-content">
        {showSidebar && (
          <aside class="sidebar">
            <span>Sidebar</span>
          </aside>
        )}
        <main>{children}</main>
      </div>
    </div>
  )
}
