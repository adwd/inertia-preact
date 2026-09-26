import { router } from 'inertia-preact'
import type { ComponentChildren } from 'preact'
import WithoutScrollRegion from '@/Layouts/WithoutScrollRegion.jsx'

const PreserveScrollFalse = ({ foo = 'default' }) => {
  const preserve = (e: MouseEvent) => {
    e.preventDefault()
    router.visit('/visits/preserve-scroll-false-page-two', { data: { foo: 'foo' }, preserveScroll: true })
  }

  const preserveFalse = (e: MouseEvent) => {
    e.preventDefault()
    router.visit('/visits/preserve-scroll-false-page-two', { data: { foo: 'bar' } })
  }

  const preserveCallback = (e: MouseEvent) => {
    e.preventDefault()
    router.visit('/visits/preserve-scroll-false-page-two', {
      data: {
        foo: 'baz',
      },
      preserveScroll: (page) => {
        console.log(JSON.stringify(page))
        return true
      },
    })
  }

  const preserveCallbackFalse = (e: MouseEvent) => {
    e.preventDefault()
    router.visit('/visits/preserve-scroll-false-page-two', {
      data: { foo: 'foo' },
      preserveScroll: (page) => {
        console.log(JSON.stringify(page))
        return false
      },
    })
  }

  const preserveGet = (e: MouseEvent) => {
    e.preventDefault()
    router.get('/visits/preserve-scroll-false-page-two', { foo: 'bar' }, { preserveScroll: true })
  }

  const preserveGetFalse = (e: MouseEvent) => {
    e.preventDefault()
    router.get('/visits/preserve-scroll-false-page-two', {
      foo: 'baz',
    })
  }

  return (
    <div
      style={{
        height: '800px',
        width: '600px',
      }}
    >
      <span class="text">
        This is the page that demonstrates scroll preservation without scroll regions when using manual visits
      </span>
      <span class="foo">Foo is now {foo}</span>

      <a href="#" onClick={preserve} class="preserve">
        Preserve Scroll
      </a>
      <a href="#" onClick={preserveFalse} class="reset">
        Reset Scroll
      </a>
      <a href="#" onClick={preserveCallback} class="preserve-callback">
        Preserve Scroll (Callback)
      </a>
      <br />
      <a href="#" onClick={preserveCallbackFalse} class="reset-callback">
        Reset Scroll (Callback)
      </a>
      <a href="#" onClick={preserveGet} class="preserve-get">
        Preserve Scroll (GET)
      </a>
      <a href="#" onClick={preserveGetFalse} class="reset-get">
        Reset Scroll (GET)
      </a>

      <a href="/non-inertia" class="off-site">
        Off-site link
      </a>
    </div>
  )
}

PreserveScrollFalse.layout = (page: ComponentChildren) => <WithoutScrollRegion children={page} />

export default PreserveScrollFalse
