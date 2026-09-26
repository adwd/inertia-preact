// This component is used for checking the TypeScript implementation; there is no Playwright test depending on it.
import { useForm } from '@adwd/inertia-preact'

interface LoginData {
  username: string
  password: string
  remember: boolean
}

export default function OptionalProps({ user }: { user?: { username: string } }) {
  useForm<LoginData>({
    username: user?.username ?? '',
    password: '',
    remember: true,
  })
}
