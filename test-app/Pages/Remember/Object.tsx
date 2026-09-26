import { Link, useRemember } from 'inertia-preact'
import { useState } from 'preact/hooks'

export default () => {
  const [untracked, setUntracked] = useState('')

  const [form, setForm] = useRemember({ name: '', remember: false })

  return (
    <div>
      <label>
        Full Name
        <input
          type="text"
          id="name"
          name="full_name"
          value={form.name}
          onInput={(e) => setForm({ ...form, name: e.currentTarget.value })}
        />
      </label>
      <label>
        Remember Me
        <input
          type="checkbox"
          id="remember"
          name="remember"
          checked={form.remember}
          onInput={(e) => setForm({ ...form, remember: e.currentTarget.checked })}
        />
      </label>
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

      <Link href="/dump/get" class="link">
        Navigate away
      </Link>
    </div>
  )
}
