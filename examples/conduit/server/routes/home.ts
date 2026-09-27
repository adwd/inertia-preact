import { defer } from '@hono/inertia'
import { Hono } from 'hono'
import type { FeedTab } from '../../src/types.ts'
import type { ArticleFilter, Store } from '../db.ts'
import type { Env } from '../session.ts'
import { type AppContext, pageNumber, viewerId } from './helpers.ts'

/** The home page, with a feed of articles */
function renderHome(store: Store, c: AppContext, tab: FeedTab, filter: ArticleFilter) {
  return c.render('Home', {
    tab,
    articles: store.articles(filter, pageNumber(c), viewerId(c)),
    // Loaded after the page is shown: it doesn't change with the tab or the page, and is kept by the visits
    // reloading only the articles
    tags: defer(() => store.popularTags()),
  })
}

/** The global feed, or the feed of the authors the user follows (`?feed=following`) */
export function homeRoutes(store: Store) {
  const routes = new Hono<Env>()

  routes.get('/', (c) => {
    if (c.req.query('feed') === 'following') {
      const user = c.get('user')
      return user ? renderHome(store, c, { type: 'following' }, { feedOf: user.id }) : c.redirect('/login')
    }

    return renderHome(store, c, { type: 'global' }, {})
  })

  return routes
}

/** The articles with a tag */
export function tagRoutes(store: Store) {
  const routes = new Hono<Env>()

  routes.get('/:tag', (c) => {
    const tag = c.req.param('tag')
    return renderHome(store, c, { type: 'tag', tag }, { tag })
  })

  return routes
}
