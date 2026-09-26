import type { ComponentChildren } from 'preact'
import { useEffect, useState } from 'preact/hooks'

export default ({ children }: { children: ComponentChildren }) => {
  const [documentScrollTop, setDocumentScrollTop] = useState(0)
  const [documentScrollLeft, setDocumentScrollLeft] = useState(0)
  const [slotScrollTop, setSlotScrollTop] = useState(0)
  const [slotScrollLeft, setSlotScrollLeft] = useState(0)

  const handleScrollEvent = () => {
    setDocumentScrollLeft(document.documentElement.scrollLeft)
    setDocumentScrollTop(document.documentElement.scrollTop)
    const slot = document.getElementById('slot')
    if (slot) {
      setSlotScrollTop(slot.scrollTop)
      setSlotScrollLeft(slot.scrollLeft)
    }
  }

  useEffect(() => {
    document.addEventListener('scroll', handleScrollEvent)

    return () => {
      document.removeEventListener('scroll', handleScrollEvent)
    }
  })

  return (
    <div style={{ width: '200vw' }}>
      <span class="layout-text">Without scroll regions</span>
      <button onClick={handleScrollEvent}>Update scroll positions</button>
      <div class="document-position">
        Document scroll position is {documentScrollLeft} & {documentScrollTop}
      </div>
      <div style={{ height: '200vh' }}>
        <span class="slot-position">
          Slot scroll position is {slotScrollLeft} & {slotScrollTop}
        </span>
        <div id="slot" style={{ height: '100px', width: '500px', overflow: 'scroll' }} onScroll={handleScrollEvent}>
          {children}
        </div>
      </div>
    </div>
  )
}
