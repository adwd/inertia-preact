import { Form, Head, Link } from '@adwd/inertia-preact'
import ErrorMessages from '../../components/ErrorMessages.tsx'

export default function Login() {
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

            <ErrorMessages />

            <Form action="/login" method="post" resetOnError={['password']} disableWhileProcessing>
              <fieldset class="form-group">
                <input
                  class="form-control form-control-lg"
                  type="email"
                  name="email"
                  placeholder="Email"
                  autocomplete="email"
                />
              </fieldset>
              <fieldset class="form-group">
                <input
                  class="form-control form-control-lg"
                  type="password"
                  name="password"
                  placeholder="Password"
                  autocomplete="current-password"
                />
              </fieldset>
              <button class="btn btn-lg btn-primary pull-xs-right" type="submit">
                Sign in
              </button>
            </Form>
          </div>
        </div>
      </div>
    </div>
  )
}
