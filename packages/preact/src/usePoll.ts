import { type PollOptions, type ReloadOptions, router } from '@inertiajs/core'
import { useEffect, useRef, useState } from 'preact/hooks'

/**
 * Reloads the page props every `interval` milliseconds while the component is mounted. Polling pauses
 * while the tab is in the background, unless `keepAlive` is set.
 */
export default function usePoll(
  interval: number,
  requestOptions: ReloadOptions | (() => ReloadOptions) = {},
  options: PollOptions = {},
): { start: () => void; stop: () => void; polling: boolean } {
  const autoStart = options.autoStart ?? true
  const latestRequestOptions = useRef(requestOptions)
  latestRequestOptions.current = requestOptions

  const poll = useRef<ReturnType<typeof router.poll> | null>(null)
  const [polling, setPolling] = useState(autoStart)

  useEffect(() => {
    // Each reload uses the latest request options
    function getRequestOptions() {
      const current = latestRequestOptions.current

      return typeof current === 'function' ? current() : current
    }

    poll.current = router.poll(interval, getRequestOptions, { ...options, autoStart })

    return () => poll.current?.destroy()
  }, [])

  const [controls] = useState(() => ({
    start: () => {
      poll.current?.start()
      setPolling(true)
    },
    stop: () => {
      poll.current?.stop()
      setPolling(false)
    },
  }))

  return { ...controls, polling }
}
