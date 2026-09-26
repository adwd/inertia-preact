import { Deferred, usePage } from '@adwd/inertia-preact'

const Users = () => {
  const { users } = usePage<{ users?: { text: string } }>().props

  return <div>{users?.text}</div>
}

export default () => {
  const { filter } = usePage<{ filter: string }>().props

  return (
    <>
      <div>Filter: {filter}</div>

      <Deferred data="users" fallback={<div>Loading users...</div>}>
        <Users />
      </Deferred>
    </>
  )
}
