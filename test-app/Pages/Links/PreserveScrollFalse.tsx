import type { Page } from '@inertiajs/core'
import { Link } from 'inertia-preact'
import type { ComponentChildren } from 'preact'
import WithoutScrollRegion from '@/Layouts/WithoutScrollRegion.jsx'

const PreserveScrollFalse = ({ foo = 'default' }: { foo?: string }) => {
  const preserveCallback = (page: Page) => {
    console.log(JSON.stringify(page))
    return true
  }

  const preserveCallbackFalse = (page: Page) => {
    console.log(JSON.stringify(page))
    return false
  }

  return (
    <div style={{ height: '800px', width: '600px' }}>
      <span class="text">This is the links page that demonstrates scroll preservation without scroll regions</span>
      <span class="foo">Foo is now {foo}</span>

      <Link href="/links/preserve-scroll-false-page-two" preserve-scroll data={{ foo: 'baz' }} class="preserve">
        Preserve Scroll
      </Link>
      <Link href="/links/preserve-scroll-false-page-two" data={{ foo: 'bar' }} class="reset">
        Reset Scroll
      </Link>

      <Link
        href="/links/preserve-scroll-false-page-two"
        preserveScroll={preserveCallback}
        data={{ foo: 'baz' }}
        class="preserve-callback"
      >
        Preserve Scroll (Callback)
      </Link>
      <Link
        href="/links/preserve-scroll-false-page-two"
        preserveScroll={preserveCallbackFalse}
        data={{ foo: 'foo' }}
        class="reset-callback"
      >
        Reset Scroll (Callback)
      </Link>

      <a href="/non-inertia" class="off-site">
        Off-site link
      </a>
    </div>
  )
}

PreserveScrollFalse.layout = (page: ComponentChildren) => <WithoutScrollRegion children={page} />

export default PreserveScrollFalse
