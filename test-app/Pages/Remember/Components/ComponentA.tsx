import { useRemember } from '@adwd/inertia-preact'
import { useState } from 'preact/hooks'

export default ({ ...props }) => {
  const [untracked, setUntracked] = useState('')
  const [data, setData] = useRemember({ name: '', remember: false }, 'Example/ComponentA')

  return (
    <div {...props}>
      <span>This component uses a string 'key' for the remember functionality.</span>
      <label>
        Full Name
        <input
          type="text"
          class="a-name"
          name="full_name"
          value={data.name}
          onInput={(e) => setData({ ...data, name: e.currentTarget.value })}
        />
      </label>
      <label>
        Remember Me
        <input
          type="checkbox"
          class="a-remember"
          name="remember"
          checked={data.remember}
          onInput={(e) => setData({ ...data, remember: e.currentTarget.checked })}
        />
      </label>
      <label>
        Remember Me
        <input
          type="text"
          class="a-untracked"
          name="untracked"
          value={untracked}
          onInput={(e) => setUntracked(e.currentTarget.value)}
        />
      </label>
    </div>
  )
}
