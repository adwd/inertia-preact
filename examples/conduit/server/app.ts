import { Hono } from 'hono'
import { csrf } from 'hono/csrf'
import { HTTPException } from 'hono/http-exception'
import type { Store } from './db.ts'
import { type Assets, inertiaPages } from './inertia.ts'
import { articleRoutes } from './routes/articles.ts'
import { loginRoutes, logoutRoutes, registerRoutes } from './routes/auth.ts'
import { editorRoutes } from './routes/editor.ts'
import { notFound } from './routes/helpers.ts'
import { homeRoutes, tagRoutes } from './routes/home.ts'
import { profileRoutes } from './routes/profiles.ts'
import { settingsRoutes } from './routes/settings.ts'
import { type Env, sessions } from './session.ts'

export interface AppOptions {
  store: Store
  assets: Assets
}

export function createApp({ store, assets }: AppOptions) {
  const app = new Hono<Env>()

  // Forms are submitted by Inertia with fetch: reject requests from other sites
  app.use(csrf())
  app.use(sessions(store))
  app.use(inertiaPages(assets))

  app.route('/', homeRoutes(store))
  app.route('/tag', tagRoutes(store))
  app.route('/login', loginRoutes(store))
  app.route('/register', registerRoutes(store))
  app.route('/logout', logoutRoutes())
  app.route('/settings', settingsRoutes(store))
  app.route('/editor', editorRoutes(store))
  app.route('/article', articleRoutes(store))
  app.route('/profile', profileRoutes(store))

  // Last, for the requests no route matched
  app.all('*', notFound)

  app.onError((error, c) => {
    // Errors meant for the client, e.g. the 403 of the CSRF protection
    if (error instanceof HTTPException) {
      return error.getResponse()
    }

    console.error(error)
    c.status(500)
    return c.render('Error', { status: 500 })
  })

  return app
}
