import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'
import type { Store, UserRow } from '../db.ts'
import type { Env } from '../session.ts'
import type { Errors } from '../validation.ts'

// Shared by the routes

export type AppContext = Context<Env>

/** Only for signed-in users: guests are sent to the login page */
export const auth = createMiddleware<Env>(async (c, next) => {
  if (!c.get('user')) {
    return c.redirect('/login', 303)
  }

  await next()
})

/** Only for guests: signed-in users are sent home */
export const guest = createMiddleware<Env>(async (c, next) => {
  if (c.get('user')) {
    return c.redirect('/', 303)
  }

  await next()
})

/** The signed-in user, in the routes behind `auth` */
export function currentUser(c: AppContext): UserRow {
  const user = c.get('user')

  if (!user) {
    throw new Error('Not signed in')
  }

  return user
}

/** The id of the signed-in user, or null for guests */
export function viewerId(c: AppContext) {
  return c.get('user')?.id ?? null
}

/** Back to the page the request came from, e.g. to show validation errors */
export function back(c: AppContext, fallback = '/') {
  const referer = c.req.header('Referer')
  const url = referer ? new URL(referer, c.req.url) : null
  const sameOrigin = url && url.origin === new URL(c.req.url).origin

  return c.redirect(sameOrigin ? url.pathname + url.search : fallback, 303)
}

/** Back to the form, with the validation errors for the next request */
export function withErrors(c: AppContext, errors: Errors) {
  c.get('session').flashNext({ errors })
  return back(c)
}

export function hasErrors(errors: Errors) {
  return Object.keys(errors).length > 0
}

export function notFound(c: AppContext) {
  c.status(404)
  return c.render('Error', { status: 404 })
}

/** The `page` query parameter, for the paginated lists */
export function pageNumber(c: AppContext) {
  const page = Number.parseInt(c.req.query('page') ?? '1', 10)
  return Number.isSafeInteger(page) && page > 0 ? page : 1
}

/** The article of the `slug` parameter, if the signed-in user wrote it: only authors may change their articles */
export function ownArticle(store: Store, c: AppContext) {
  const article = store.articleRow(c.req.param('slug')!)
  return article && article.author_id === c.get('user')?.id ? article : undefined
}
