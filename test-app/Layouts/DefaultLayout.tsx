import type { ComponentChildren } from 'preact'
export default ({ children }: { children: ComponentChildren }) => {
  return (
    <div id="default-layout">
      <span>Default Layout</span>
      {children}
    </div>
  )
}
