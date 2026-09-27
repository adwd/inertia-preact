import { Hono } from 'hono'
import type { Store } from '../db.ts'
import type { Env } from '../session.ts'
import { type AppContext, auth, back, currentUser, notFound, pageNumber, viewerId } from './helpers.ts'

/** Profiles with their articles or favorites, and following */
export function profileRoutes(store: Store) {
  const routes = new Hono<Env>()

  function profile(c: AppContext, tab: 'articles' | 'favorites') {
    const username = c.req.param('username')!
    const found = store.profile(username, viewerId(c))

    if (!found) {
      return notFound(c)
    }

    const filter = tab === 'articles' ? { author: username } : { favoritedBy: username }

    return c.render('Profile', {
      profile: found.profile,
      tab,
      articles: store.articles(filter, pageNumber(c), viewerId(c)),
      isSelf: found.id === viewerId(c),
    })
  }

  routes.get('/profile/:username', (c) => profile(c, 'articles'))
  routes.get('/profile/:username/favorites', (c) => profile(c, 'favorites'))

  // Another user, to follow or unfollow
  function followee(c: AppContext) {
    const user = store.userByUsername(c.req.param('username')!)
    return user && user.id !== c.get('user')?.id ? user : undefined
  }

  routes.post('/profile/:username/follow', auth, (c) => {
    const user = followee(c)

    if (!user) {
      return notFound(c)
    }

    store.follow(currentUser(c).id, user.id)
    return back(c)
  })

  routes.delete('/profile/:username/follow', auth, (c) => {
    const user = followee(c)

    if (!user) {
      return notFound(c)
    }

    store.unfollow(currentUser(c).id, user.id)
    return back(c)
  })

  return routes
}
