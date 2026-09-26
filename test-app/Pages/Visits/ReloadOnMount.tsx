import { router } from 'inertia-preact'
import { useEffect } from 'preact/hooks'

export default (props: { name: string }) => {
  useEffect(() => {
    router.reload({ only: ['name'] })
  }, [])

  return <div>Name is {props.name}</div>
}
