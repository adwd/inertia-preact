import { Deferred, router } from 'inertia-preact'
import { useEffect } from 'preact/hooks'

export default ({ foo, bar }: { foo?: { text: string }; bar?: { text: string } }) => {
  useEffect(() => {
    router.reload({
      only: ['foo'],
    })
  }, [])

  return (
    <>
      <Deferred data="foo" fallback={<div>Loading foo...</div>}>
        <div>{foo?.text}</div>
      </Deferred>

      <Deferred data="bar" fallback={<div>Loading bar...</div>}>
        <div>{bar?.text}</div>
      </Deferred>
    </>
  )
}
