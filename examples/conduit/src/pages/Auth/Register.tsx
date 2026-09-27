import { Form, Head, Link } from '@adwd/inertia-preact'
import ErrorMessages from '../../components/ErrorMessages.tsx'

export default function Register() {
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

            <ErrorMessages />

            <Form action="/register" method="post" resetOnError={['password']} disableWhileProcessing>
              <fieldset class="form-group">
                <input
                  class="form-control form-control-lg"
                  type="text"
                  name="username"
                  placeholder="Username"
                  autocomplete="username"
                />
              </fieldset>
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
                  autocomplete="new-password"
                />
              </fieldset>
              <button class="btn btn-lg btn-primary pull-xs-right" type="submit">
                Sign up
              </button>
            </Form>
          </div>
        </div>
      </div>
    </div>
  )
}
