import { Hono } from 'hono'
import type { Store } from '../db.ts'
import { hashPassword } from '../password.ts'
import type { Env } from '../session.ts'
import { formInput, isEmail, isHttpUrl, text, validate } from '../validation.ts'
import { auth, currentUser, hasErrors, withErrors } from './helpers.ts'

/** The settings of the signed-in user */
export function settingsRoutes(store: Store) {
  const routes = new Hono<Env>()

  routes.get('/settings', auth, (c) => c.render('Settings', {}))

  routes.put('/settings', auth, async (c) => {
    const user = currentUser(c)
    const input = await formInput(c)
    const username = text(input.username)
    const email = text(input.email)
    const image = text(input.image)
    const bio = text(input.bio)
    const password = typeof input.password === 'string' ? input.password : ''

    const errors = validate([
      ['image', image !== '' && !isHttpUrl(image), 'image must be a URL'],
      ['username', username === '', "username can't be blank"],
      [
        'username',
        !/^[\w.-]{1,30}$/.test(username),
        'username may only contain letters, numbers, ., - and _ (up to 30)',
      ],
      ['username', store.isUsernameTaken(username, user.id), 'username has already been taken'],
      ['email', !isEmail(email), 'email is invalid'],
      ['email', store.isEmailTaken(email, user.id), 'email has already been taken'],
      ['password', password !== '' && password.length < 8, 'password is too short (minimum is 8 characters)'],
    ])

    if (hasErrors(errors)) {
      return withErrors(c, errors)
    }

    store.updateUser(user.id, {
      username,
      email,
      bio: bio || null,
      image: image || null,
      passwordHash: password ? await hashPassword(password) : undefined,
    })

    return c.redirect(`/profile/${encodeURIComponent(username)}`, 303)
  })

  return routes
}
