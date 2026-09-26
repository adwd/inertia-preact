import type { InertiaForm } from '@adwd/inertia-preact'
// This component is used for checking the TypeScript implementation; there is no Playwright test depending on it.
import type { FormDataConvertible } from '@inertiajs/core'

interface GenericProps<TFormData extends Record<string, FormDataConvertible>> {
  form: InertiaForm<TFormData>
}

export default function Generic<TFormData extends Record<string, FormDataConvertible>>({
  form,
}: GenericProps<TFormData>) {
  console.log(form)
  return <div>{/* Generic form component */}</div>
}
