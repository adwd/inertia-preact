import { Link } from '@adwd/inertia-preact'
import { useState } from 'preact/hooks'

export default () => {
  const [name, setName] = useState('')
  const [remember, setRemember] = useState(false)
  const [untracked, setUntracked] = useState('')

  return (
    <div>
      <label>
        Full Name
        <input type="text" id="name" name="full_name" value={name} onInput={(e) => setName(e.currentTarget.value)} />
      </label>
      <label>
        Remember Me
        <input
          type="checkbox"
          id="remember"
          name="remember"
          checked={remember}
          onInput={(e) => setRemember(e.currentTarget.checked)}
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
