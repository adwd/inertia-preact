import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import type { Store, UserRow } from './db.ts'

const COOKIE = 'conduit_session'
const LIFETIME_DAYS = 30

/** Data kept for the next request only, e.g. the validation errors after a redirect */
export interface Flash {
  errors?: Record<string, string>
}

export type Env = {
  Variables: {
    session: Session
    user: UserRow | null
  }
}

/**
 * A session stored in the database, referenced by an HTTP-only cookie. Guests get one only when needed, to
 * keep flash data.
 */
export class Session {
  /** The flash data of the previous request */
  readonly flash: Flash
  private id: string | undefined

  constructor(
    private readonly store: Store,
    private readonly c: Context,
    id: string | undefined,
    flash: Flash,
  ) {
    this.id = id
    this.flash = flash
  }

  /** Starts a new session for the user, so a session id obtained before signing in is useless */
  login(userId: number) {
    this.destroy()
    this.start(userId)
  }

  logout() {
    this.destroy()
    deleteCookie(this.c, COOKIE, { path: '/' })
  }

  /** Keeps data for the next request */
  flashNext(flash: Flash) {
    this.id ??= this.start(null)
    this.store.setSessionFlash(this.id, JSON.stringify(flash))
  }

  private start(userId: number | null) {
    this.id = this.store.createSession(userId, LIFETIME_DAYS)

    setCookie(this.c, COOKIE, this.id, {
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
      secure: new URL(this.c.req.url).protocol === 'https:',
      maxAge: LIFETIME_DAYS * 24 * 60 * 60,
    })

    return this.id
  }

  private destroy() {
    if (this.id) {
      this.store.deleteSession(this.id)
      this.id = undefined
    }
  }
}

export function sessions(store: Store) {
  return createMiddleware<Env>(async (c, next) => {
    const id = getCookie(c, COOKIE)
    const row = id ? store.session(id) : undefined
    let flash: Flash = {}

    if (row?.flash) {
      flash = JSON.parse(row.flash) as Flash
      store.setSessionFlash(row.id, null)
    }

    c.set('session', new Session(store, c, row?.id, flash))
    c.set('user', row?.user_id ? (store.userById(row.user_id) ?? null) : null)

    await next()
  })
}
