import { Link, useForm } from '@adwd/inertia-preact'
import { useState } from 'preact/hooks'

export default () => {
  const [untracked, setUntracked] = useState('')

  const form = useForm({ name: 'foo', handle: 'example', remember: false })

  const submit = () => {
    form.post('/remember/form-helper/default')
  }

  return (
    <div>
      <label>
        Full Name
        <input
          type="text"
          id="name"
          name="name"
          value={form.data.name}
          onInput={(e) => form.setData('name', e.currentTarget.value)}
        />
      </label>
      {form.errors.name && <span class="name_error">{form.errors.name}</span>}
      <label>
        Handle
        <input
          type="text"
          id="handle"
          name="handle"
          value={form.data.handle}
          onInput={(e) => form.setData('handle', e.currentTarget.value)}
        />
      </label>
      {form.errors.handle && <span class="handle_error">{form.errors.handle}</span>}
      <label>
        Remember Me
        <input
          type="checkbox"
          id="remember"
          name="remember"
          checked={form.data.remember}
          onInput={(e) => form.setData('remember', e.currentTarget.checked)}
        />
      </label>
      {form.errors.remember && <span class="remember_error">{form.errors.remember}</span>}
      <label>
        Untracked
        <input
          type="text"
          id="untracked"
          name="untracked"
          value={untracked}
          onInput={(e) => setUntracked(e.currentTarget.value)}
        />
      </label>

      <button onClick={submit} class="submit">
        Submit form
      </button>

      <Link href="/dump/get" class="link">
        Navigate away
      </Link>
    </div>
  )
}
