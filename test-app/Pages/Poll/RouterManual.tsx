import { router } from '@adwd/inertia-preact'
import { useRef } from 'preact/hooks'

export default () => {
  const pollRef = useRef(
    router.poll(
      500,
      {
        only: ['custom_prop'],
        onFinish() {
          console.log('hook poll finished')
        },
      },
      {
        autoStart: false,
      },
    ),
  )

  return (
    <>
      <button onClick={pollRef.current.start}>Start</button>
      <button onClick={pollRef.current.stop}>Stop</button>
    </>
  )
}
