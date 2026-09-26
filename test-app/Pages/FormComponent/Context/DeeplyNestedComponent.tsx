import { useFormContext } from 'inertia-preact'

export default () => {
  const form = useFormContext()

  return form ? (
    <div>
      <span>Deeply Nested: Form is {form.isDirty ? 'dirty' : 'clean'}</span>
    </div>
  ) : (
    <div>No context</div>
  )
}
