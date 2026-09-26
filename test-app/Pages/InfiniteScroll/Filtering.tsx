import { debounce } from 'es-toolkit'
import { InfiniteScroll, Link, useForm } from 'inertia-preact'
import type { TargetedEvent } from 'preact'
import { useEffect, useMemo } from 'preact/hooks'
import UserCard, { User } from './UserCard'

interface Props {
  users: { data: User[] }
  preserveState: boolean
  filter?: string
  search?: string
}

export default ({ users, preserveState, filter, search }: Props) => {
  const { data, setData, get } = useForm({
    filter: undefined,
    page: undefined,
    search: search,
  })

  const debouncedSearch = useMemo(
    () =>
      debounce(() => {
        get(
          '',
          preserveState
            ? {
                preserveState: true,
                replace: true,
                only: ['users', 'search', 'filter'],
                reset: ['users'],
              }
            : {
                replace: true,
              },
        )
      }, 250),
    [get, preserveState],
  )

  useEffect(() => {
    if (data.search !== search) {
      debouncedSearch()
    }

    return () => {
      debouncedSearch.cancel?.()
    }
  }, [data.search, search, debouncedSearch])

  const handleSearchChange = (e: TargetedEvent<HTMLInputElement>) => {
    setData('search', e.currentTarget.value)
  }

  return (
    <div>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <Link href="">No Filter</Link>
        <Link href="?filter=a-m">A-M</Link>
        <Link href="?filter=n-z">N-Z</Link>
        <div>Current filter: {filter || 'none'}</div>
        <div>Current search: {search || 'none'}</div>
        <input value={data.search || ''} onInput={handleSearchChange} placeholder="Search..." />
      </div>

      <InfiniteScroll
        data="users"
        style={{ display: 'grid', gap: '20px' }}
        loading={() => <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>}
      >
        {users.data.map((user) => (
          <UserCard key={user.id} user={user} />
        ))}
      </InfiniteScroll>

      <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <Link href="">No Filter</Link>
        <Link href="?filter=a-m">A-M</Link>
        <Link href="?filter=n-z">N-Z</Link>
        <div>Current filter: {filter || 'none'}</div>
        <div>Current search: {search || 'none'}</div>
        <input value={data.search || ''} onInput={handleSearchChange} placeholder="Search..." />
      </div>
    </div>
  )
}
