import { InfiniteScroll } from 'inertia-preact'
import { useLayoutEffect, useState } from 'preact/hooks'
import UserCard, { User } from './UserCard'

const LifecycleMarker = () => {
  useLayoutEffect(() => {
    console.log('marker mounted')
    return () => console.log('marker destroyed')
  }, [])
  return null
}

export default ({ users }: { users: { data: User[] } }) => {
  const [show, setShow] = useState(false)
  const [cycleCount, setCycleCount] = useState(0)

  // Unmount in the render right after the mount was committed: the tightest mount/unmount cycle
  // Preact allows, before InfiniteScroll gets to set anything up after mounting.
  useLayoutEffect(() => {
    if (show) {
      setShow(false)
      setCycleCount((count) => count + 1)
    }
  }, [show])

  return (
    <div>
      <button onClick={() => setShow(true)}>Cycle Mount</button>
      <p id="cycle-count">Cycles: {cycleCount}</p>

      {show && (
        <>
          <LifecycleMarker />
          <InfiniteScroll data="users" style={{ display: 'grid', gap: '20px' }}>
            {users.data.map((user) => (
              <UserCard key={user.id} user={user} />
            ))}
          </InfiniteScroll>
        </>
      )}
    </div>
  )
}
