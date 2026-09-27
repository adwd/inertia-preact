import { Head, Link, useForm } from '@adwd/inertia-preact'
import ErrorMessages from '../../components/ErrorMessages.tsx'

export default function Login() {
  const form = useForm({ email: '', password: '' })

  const submit = (event: SubmitEvent) => {
    event.preventDefault()
    form.post('/login', { onError: () => form.reset('password') })
  }

  return (
    <div class="auth-page">
      <Head title="Sign in" />

      <div class="container page">
        <div class="row">
          <div class="col-md-6 offset-md-3 col-xs-12">
            <h1 class="text-xs-center">Sign in</h1>
            <p class="text-xs-center">
              <Link href="/register">Need an account?</Link>
            </p>

            <ErrorMessages errors={form.errors} />

            <form onSubmit={submit}>
              <fieldset disabled={form.processing}>
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
                    autocomplete="current-password"
                    value={form.data.password}
                    onInput={(event) => form.setData('password', event.currentTarget.value)}
                  />
                </fieldset>
                <button class="btn btn-lg btn-primary pull-xs-right" type="submit">
                  Sign in
                </button>
              </fieldset>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
