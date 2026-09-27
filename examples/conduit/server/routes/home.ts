import { defer } from '@hono/inertia'
import { Hono } from 'hono'
import type { FeedTab } from '../../src/types.ts'
import type { ArticleFilter, Store } from '../db.ts'
import type { Env } from '../session.ts'
import { type AppContext, pageNumber, viewerId } from './helpers.ts'

/** The home page: the global feed, the feed of followed authors, or the articles with a tag */
export function homeRoutes(store: Store) {
  const routes = new Hono<Env>()

  function home(c: AppContext, tab: FeedTab, filter: ArticleFilter) {
    return c.render('Home', {
      tab,
      articles: store.articles(filter, pageNumber(c), viewerId(c)),
      // Loaded after the page is shown: it doesn't change with the tab or the page, and is kept by the visits
      // reloading only the articles
      tags: defer(() => store.popularTags()),
    })
  }

  routes.get('/', (c) => {
    if (c.req.query('feed') === 'following') {
      const user = c.get('user')
      return user ? home(c, { type: 'following' }, { feedOf: user.id }) : c.redirect('/login')
    }

    return home(c, { type: 'global' }, {})
  })

  routes.get('/tag/:tag', (c) => home(c, { type: 'tag', tag: c.req.param('tag') }, { tag: c.req.param('tag') }))

  return routes
}
