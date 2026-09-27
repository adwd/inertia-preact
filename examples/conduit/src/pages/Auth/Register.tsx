import { Head, Link, useForm } from '@adwd/inertia-preact'
import ErrorMessages from '../../components/ErrorMessages.tsx'

export default function Register() {
  const form = useForm({ username: '', email: '', password: '' })

  const submit = (event: SubmitEvent) => {
    event.preventDefault()
    form.post('/register', { onError: () => form.reset('password') })
  }

  return (
    <div class="auth-page">
      <Head title="Sign up" />

      <div class="container page">
        <div class="row">
          <div class="col-md-6 offset-md-3 col-xs-12">
            <h1 class="text-xs-center">Sign up</h1>
            <p class="text-xs-center">
              <Link href="/login">Have an account?</Link>
            </p>

            <ErrorMessages errors={form.errors} />

            <form onSubmit={submit}>
              <fieldset disabled={form.processing}>
                <fieldset class="form-group">
                  <input
                    class="form-control form-control-lg"
                    type="text"
                    name="username"
                    placeholder="Username"
                    autocomplete="username"
                    value={form.data.username}
                    onInput={(event) => form.setData('username', event.currentTarget.value)}
                  />
                </fieldset>
                <fieldset class="form-group">
                  <input
                    class="form-control form-control-lg"
                    type="email"
                    name="email"
                    placeholder="Email"
                    autocomplete="email"
                    value={form.data.email}
                    onInput={(event) => form.setData('email', event.currentTarget.value)}
                  />
                </fieldset>
                <fieldset class="form-group">
                  <input
                    class="form-control form-control-lg"
                    type="password"
                    name="password"
                    placeholder="Password"
                    autocomplete="new-password"
                    value={form.data.password}
                    onInput={(event) => form.setData('password', event.currentTarget.value)}
                  />
                </fieldset>
                <button class="btn btn-lg btn-primary pull-xs-right" type="submit">
                  Sign up
                </button>
              </fieldset>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
