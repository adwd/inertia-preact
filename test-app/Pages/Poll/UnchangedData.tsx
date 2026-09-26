import { usePoll } from '@adwd/inertia-preact'
import { useLayoutEffect, useState } from 'preact/hooks'

export default () => {
  const [replaceStateCalls, setReplaceStateCalls] = useState(0)
  const [pollsFinished, setPollsFinished] = useState(0)

  useLayoutEffect(() => {
    const original = window.history.replaceState.bind(window.history)
    window.history.replaceState = function (...args) {
      setReplaceStateCalls((c) => c + 1)
      return original(...args)
    }
  }, [])

  usePoll(500, {
    only: ['custom_prop'],
    onFinish: () => setPollsFinished((c) => c + 1),
  })

  return (
    <div>
      <p>
        replaceState calls: <span class="replaceStateCalls">{replaceStateCalls}</span>
      </p>
      <p>
        polls finished: <span class="pollsFinished">{pollsFinished}</span>
      </p>
    </div>
  )
}
