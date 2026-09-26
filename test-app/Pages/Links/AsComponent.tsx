import { Link } from 'inertia-preact'
import type { ComponentChildren } from 'preact'
import { useRef } from 'preact/hooks'

declare global {
  interface Window {
    componentEvents: Array<{ eventName: string; data: unknown; timestamp: number }>
  }
}

window.componentEvents = []

const CustomButton = ({ children, ...props }: { children: ComponentChildren; [key: string]: unknown }) => (
  <button
    {...props}
    style={{
      backgroundColor: 'blue',
      color: 'white',
      padding: '10px',
    }}
  >
    {children}
  </button>
)

export default ({ page }: { page: number }) => {
  const state = useRef(crypto.randomUUID())

  const trackEvent = (eventName: string, data: unknown = null) => {
    window.componentEvents.push({ eventName, data, timestamp: Date.now() })
  }

  return (
    <div>
      <h1>Link Custom Component - Page {page}</h1>
      <p id="state">State: {state.current}</p>
      <Link as={CustomButton} href="/dump/get" class="get">
        GET Custom Component
      </Link>
      <Link as={CustomButton} method="post" href="/dump/post" class="post">
        POST Custom Component
      </Link>
      <Link as={CustomButton} method="post" href="/dump/post" data={{ test: 'data' }} class="data">
        Custom Component with Data
      </Link>
      <Link as={CustomButton} href="/dump/get" headers={{ 'X-Test': 'header' }} class="headers">
        Custom Component with Headers
      </Link>
      <Link as={CustomButton} href="/links/as-component/2" preserveState={true} class="preserve">
        Custom Component with Preserve State
      </Link>
      <Link as={CustomButton} href="/links/as-component/3" replace={true} class="replace">
        Custom Component with Replace
      </Link>
      <Link
        as={CustomButton}
        href="/dump/get"
        onStart={(event) => trackEvent('onStart', event)}
        onFinish={(event) => trackEvent('onFinish', event)}
        onSuccess={(page) => trackEvent('onSuccess', page)}
        class="events"
      >
        Custom Component with Events
      </Link>
    </div>
  )
}
