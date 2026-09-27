import { Head, Link, useForm, usePage } from '@adwd/inertia-preact'
import ErrorMessages from '../components/ErrorMessages.tsx'

export default function Settings() {
  // Only signed-in users get here (the server redirects guests)
  const user = usePage().props.auth.user!

  const form = useForm({
    image: user.image ?? '',
    username: user.username,
    bio: user.bio ?? '',
    email: user.email,
    password: '',
  })

  function submit(event: SubmitEvent) {
    event.preventDefault()
    form.put('/settings', { onFinish: () => form.reset('password') })
  }

  return (
    <div class="settings-page">
      <Head title="Settings" />

      <div class="container page">
        <div class="row">
          <div class="col-md-6 offset-md-3 col-xs-12">
            <h1 class="text-xs-center">Your Settings</h1>

            <ErrorMessages errors={form.errors} />

            <form onSubmit={submit}>
              <fieldset disabled={form.processing}>
                <fieldset class="form-group">
                  <input
                    class="form-control"
                    type="url"
                    name="image"
                    placeholder="URL of profile picture"
                    value={form.data.image}
                    onInput={(event) => form.setData('image', event.currentTarget.value)}
                  />
                </fieldset>
                <fieldset class="form-group">
                  <input
                    class="form-control form-control-lg"
                    type="text"
                    name="username"
                    placeholder="Your Name"
                    autocomplete="username"
                    value={form.data.username}
                    onInput={(event) => form.setData('username', event.currentTarget.value)}
                  />
                </fieldset>
                <fieldset class="form-group">
                  <textarea
                    class="form-control form-control-lg"
                    rows={8}
                    name="bio"
                    placeholder="Short bio about you"
                    value={form.data.bio}
                    onInput={(event) => form.setData('bio', event.currentTarget.value)}
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
                    placeholder="New Password"
                    autocomplete="new-password"
                    value={form.data.password}
                    onInput={(event) => form.setData('password', event.currentTarget.value)}
                  />
                </fieldset>
                <button class="btn btn-lg btn-primary pull-xs-right" type="submit">
                  Update Settings
                </button>
              </fieldset>
            </form>

            <hr />

            <Link as="button" method="post" href="/logout" class="btn btn-outline-danger">
              Or click here to logout.
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
