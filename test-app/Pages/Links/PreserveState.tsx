import type { Page } from '@inertiajs/core'
import { Link } from 'inertia-preact'
import type { ComponentChildren } from 'preact'
import { useId } from 'preact/hooks'
import WithoutScrollRegion from '@/Layouts/WithoutScrollRegion.jsx'

const PreserveState = ({ foo = 'default' }: { foo?: string }) => {
  const preserveCallback = (page: Page) => {
    alert(page)
    return true
  }

  const preserveCallbackFalse = (page: Page) => {
    alert(page)
    return false
  }

  window._inertia_page_key = useId()

  return (
    <div>
      <span class="text">This is the links page that demonstrates preserve state on Links</span>
      <span class="foo">Foo is now {foo}</span>
      <label>
        Example Field
        <input type="text" name="example-field" class="field" />
      </label>

      <Link href="/links/preserve-state-page-two" preserveState data={{ foo: 'bar' }} class="preserve">
        [State] Preserve: true
      </Link>
      <Link href="/links/preserve-state-page-two" preserveState={false} data={{ foo: 'baz' }} class="preserve-false">
        [State] Preserve: false
      </Link>

      <Link
        href="/links/preserve-state-page-two"
        preserveState={preserveCallback}
        data={{ foo: 'callback-bar' }}
        class="preserve-callback"
      >
        [State] Preserve Callback: true
      </Link>
      <Link
        href="/links/preserve-state-page-two"
        preserveState={preserveCallbackFalse}
        data={{ foo: 'callback-baz' }}
        class="preserve-callback-false"
      >
        [State] Preserve Callback: false
      </Link>
    </div>
  )
}

PreserveState.layout = (page: ComponentChildren) => <WithoutScrollRegion children={page} />

export default PreserveState
