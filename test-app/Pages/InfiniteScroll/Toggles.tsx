import { InfiniteScroll } from '@adwd/inertia-preact'
import { useState } from 'preact/hooks'
import UserCard, { User } from './UserCard'

export default ({ users }: { users: { data: User[] } }) => {
  const [manual, setManual] = useState(false)
  const [preserveUrl, setPreserveUrl] = useState(false)
  const [triggerMode, setTriggerMode] = useState<'onlyPrevious' | 'onlyNext' | 'both'>('onlyNext')

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <p>
          <label>
            <input type="checkbox" checked={manual} onInput={(e) => setManual(e.currentTarget.checked)} />
            Manual mode: {manual.toString()}
          </label>
        </p>

        <p>
          <label>
            <input type="checkbox" checked={preserveUrl} onInput={(e) => setPreserveUrl(e.currentTarget.checked)} />
            Preserve URL: {preserveUrl.toString()}
          </label>
        </p>

        <p>
          <label>
            Trigger mode: {triggerMode}
            <select
              value={triggerMode}
              onInput={(e) => setTriggerMode(e.currentTarget.value as 'onlyPrevious' | 'onlyNext' | 'both')}
            >
              <option value="onlyPrevious">onlyPrevious</option>
              <option value="onlyNext">onlyNext</option>
              <option value="both">both</option>
            </select>
          </label>
        </p>
      </div>

      <InfiniteScroll
        data="users"
        style={{ display: 'grid', gap: '20px' }}
        manual={manual}
        preserveUrl={preserveUrl}
        onlyNext={triggerMode === 'onlyNext'}
        onlyPrevious={triggerMode === 'onlyPrevious'}
        loading={<div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>}
      >
        {users.data.map((user) => (
          <UserCard key={user.id} user={user} />
        ))}
      </InfiniteScroll>

      <p>Total items on page: {users.data.length}</p>
    </div>
  )
}
