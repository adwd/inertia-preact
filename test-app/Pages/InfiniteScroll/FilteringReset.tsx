import { InfiniteScroll, useForm } from '@adwd/inertia-preact'
import { debounce } from 'es-toolkit'
import type { TargetedEvent } from 'preact'
import { useEffect, useMemo } from 'preact/hooks'
import UserCard, { User } from './UserCard'

export default ({ users, search }: { users: { data: User[] }; search?: string }) => {
  const { data, setData, get } = useForm({
    search: search,
  })

  const debouncedSearch = useMemo(
    () =>
      debounce(() => {
        get('', {
          preserveState: true,
          replace: true,
          only: ['users', 'search'],
          reset: ['users'],
        })
      }, 250),
    [get],
  )

  useEffect(() => {
    if (data.search !== search) {
      debouncedSearch()
    }
  }, [data.search, search, debouncedSearch])

  const handleSearchChange = (e: TargetedEvent<HTMLInputElement>) => {
    setData('search', e.currentTarget.value)
  }

  return (
    <div>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <div>Current search: {search || 'none'}</div>
        <input value={data.search || ''} onInput={handleSearchChange} placeholder="Search..." />
      </div>

      <InfiniteScroll
        data="users"
        buffer={2000}
        style={{ display: 'grid', gap: '20px' }}
        loading={() => <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>}
      >
        {users.data.map((user) => (
          <UserCard key={user.id} user={user} />
        ))}
      </InfiniteScroll>
    </div>
  )
}
