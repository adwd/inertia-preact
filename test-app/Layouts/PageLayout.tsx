import type { ComponentChildren } from 'preact'
export default ({ children }: { children: ComponentChildren }) => {
  return (
    <div id="page-layout">
      <span>Page Layout</span>
      {children}
    </div>
  )
}
