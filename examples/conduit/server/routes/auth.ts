import { randomBytes } from 'node:crypto'
import { Hono } from 'hono'
import type { Store } from '../db.ts'
import { hashPassword, verifyPassword } from '../password.ts'
import type { Env } from '../session.ts'
import { formInput, isEmail, text, validate } from '../validation.ts'
import { guest, hasErrors, withErrors } from './helpers.ts'

/** Signing in */
export function loginRoutes(store: Store) {
  const routes = new Hono<Env>()
  const unknownUserHash = hashPassword(randomBytes(16).toString('hex'))

  routes.get('/', guest, (c) => c.render('Auth/Login', {}))

  routes.post('/', guest, async (c) => {
    const input = await formInput(c)
    const email = text(input.email)
    const password = typeof input.password === 'string' ? input.password : ''

    const errors = validate([
      ['email', email === '', "email can't be blank"],
      ['password', password === '', "password can't be blank"],
    ])

    if (hasErrors(errors)) {
      return withErrors(c, errors)
    }

    const user = store.userByEmail(email)
    // Checks a password even without a user, so the response time doesn't tell which emails are registered
    const valid = await verifyPassword(password, user?.password_hash ?? (await unknownUserHash))

    if (!user || !valid) {
      return withErrors(c, { email: 'email or password is invalid' })
    }

    c.get('session').login(user.id)
    return c.redirect('/', 303)
  })

  return routes
}

/** Signing up */
export function registerRoutes(store: Store) {
  const routes = new Hono<Env>()

  routes.get('/', guest, (c) => c.render('Auth/Register', {}))

  routes.post('/', guest, async (c) => {
    const input = await formInput(c)
    const username = text(input.username)
    const email = text(input.email)
    const password = typeof input.password === 'string' ? input.password : ''

    const errors = validate([
      ['username', username === '', "username can't be blank"],
      [
        'username',
        !/^[\w.-]{1,30}$/.test(username),
        'username may only contain letters, numbers, ., - and _ (up to 30)',
      ],
      ['username', store.isUsernameTaken(username), 'username has already been taken'],
      ['email', email === '', "email can't be blank"],
      ['email', !isEmail(email), 'email is invalid'],
      ['email', store.isEmailTaken(email), 'email has already been taken'],
      ['password', password.length < 8, 'password is too short (minimum is 8 characters)'],
    ])

    if (hasErrors(errors)) {
      return withErrors(c, errors)
    }

    const userId = store.createUser({ username, email, passwordHash: await hashPassword(password) })

    c.get('session').login(userId)
    return c.redirect('/', 303)
  })

  return routes
}

/** Signing out */
export function logoutRoutes() {
  const routes = new Hono<Env>()

  routes.post('/', (c) => {
    c.get('session').logout()
    return c.redirect('/', 303)
  })

  return routes
}
