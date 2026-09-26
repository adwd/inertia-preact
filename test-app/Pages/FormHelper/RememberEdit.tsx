import { useForm } from '@adwd/inertia-preact'

interface User {
  id: number
  name: string
  email: string
}

export default ({ user }: { user: User }) => {
  const form = useForm('EditUserForm', {
    name: user.name,
    email: user.email,
  })

  return (
    <div>
      <h1>Edit User {user.id}</h1>
      <form>
        <div>
          <label>Name:</label>
          <input type="text" value={form.data.name} onInput={(e) => form.setData('name', e.currentTarget.value)} />
        </div>
        <div>
          <label>Email:</label>
          <input type="email" value={form.data.email} onInput={(e) => form.setData('email', e.currentTarget.value)} />
        </div>
      </form>
    </div>
  )
}
