import { usePoll } from 'inertia-preact'

export default () => {
  const { start, stop, polling } = usePoll(
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
  )

  return (
    <>
      <button onClick={start}>Start</button>
      <button onClick={stop}>Stop</button>
      <div>Polling: {polling ? 'yes' : 'no'}</div>
    </>
  )
}
