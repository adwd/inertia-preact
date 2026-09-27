import { Form, Head, usePage } from '@adwd/inertia-preact'
import ErrorMessages from '../components/ErrorMessages.tsx'

export default function Settings() {
  // Only signed-in users get here (the server redirects guests)
  const user = usePage().props.auth.user!

  return (
    <div class="settings-page">
      <Head title="Settings" />

      <div class="container page">
        <div class="row">
          <div class="col-md-6 offset-md-3 col-xs-12">
            <h1 class="text-xs-center">Your Settings</h1>

            <ErrorMessages />

            <Form action="/settings" method="put" resetOnError={['password']} disableWhileProcessing>
              <fieldset class="form-group">
                <input
                  class="form-control"
                  type="url"
                  name="image"
                  placeholder="URL of profile picture"
                  defaultValue={user.image ?? ''}
                />
              </fieldset>
              <fieldset class="form-group">
                <input
                  class="form-control form-control-lg"
                  type="text"
                  name="username"
                  placeholder="Your Name"
                  autocomplete="username"
                  defaultValue={user.username}
                />
              </fieldset>
              <fieldset class="form-group">
                <textarea
                  class="form-control form-control-lg"
                  rows={8}
                  name="bio"
                  placeholder="Short bio about you"
                  defaultValue={user.bio ?? ''}
                />
              </fieldset>
              <fieldset class="form-group">
                <input
                  class="form-control form-control-lg"
                  type="email"
                  name="email"
                  placeholder="Email"
                  autocomplete="email"
                  defaultValue={user.email}
                />
              </fieldset>
              <fieldset class="form-group">
                <input
                  class="form-control form-control-lg"
                  type="password"
                  name="password"
                  placeholder="New Password"
                  autocomplete="new-password"
                />
              </fieldset>
              <button class="btn btn-lg btn-primary pull-xs-right" type="submit">
                Update Settings
              </button>
            </Form>

            <hr />

            <Form action="/logout" method="post">
              <button class="btn btn-outline-danger" type="submit">
                Or click here to logout.
              </button>
            </Form>
          </div>
        </div>
      </div>
    </div>
  )
}
