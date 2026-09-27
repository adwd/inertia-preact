import { Hono } from 'hono'
import type { Store } from '../db.ts'
import { renderMarkdown } from '../markdown.ts'
import type { Env } from '../session.ts'
import { formInput, text, validate } from '../validation.ts'
import { auth, back, currentUser, hasErrors, notFound, ownArticle, viewerId, withErrors } from './helpers.ts'

/** An article with its comments, and what readers do with it: favoriting, commenting, deleting */
export function articleRoutes(store: Store) {
  const routes = new Hono<Env>()

  routes.get('/:slug', (c) => {
    const found = store.article(c.req.param('slug'), viewerId(c))

    if (!found) {
      return notFound(c)
    }

    const isAuthor = found.row.author_id === viewerId(c)

    return c.render('Article', {
      article: {
        ...found.preview,
        bodyHtml: renderMarkdown(found.row.body),
        can: { edit: isAuthor, delete: isAuthor },
      },
      comments: store.comments(found.row.id, viewerId(c)),
    })
  })

  routes.delete('/:slug', auth, (c) => {
    const article = ownArticle(store, c)

    if (!article) {
      return notFound(c)
    }

    store.deleteArticle(article.id)
    return c.redirect('/', 303)
  })

  // Favorites

  routes.post('/:slug/favorite', auth, (c) => {
    const article = store.articleRow(c.req.param('slug'))

    if (!article) {
      return notFound(c)
    }

    store.favorite(currentUser(c).id, article.id)
    return back(c)
  })

  routes.delete('/:slug/favorite', auth, (c) => {
    const article = store.articleRow(c.req.param('slug'))

    if (!article) {
      return notFound(c)
    }

    store.unfavorite(currentUser(c).id, article.id)
    return back(c)
  })

  // Comments

  routes.post('/:slug/comments', auth, async (c) => {
    const article = store.articleRow(c.req.param('slug'))

    if (!article) {
      return notFound(c)
    }

    const body = text((await formInput(c)).body)
    const errors = validate([
      ['body', body === '', "body can't be blank"],
      ['body', body.length > 5000, 'body is too long (maximum is 5000 characters)'],
    ])

    if (hasErrors(errors)) {
      return withErrors(c, errors)
    }

    store.addComment(article.id, currentUser(c).id, body)
    return back(c)
  })

  routes.delete('/:slug/comments/:id', auth, (c) => {
    const comment = store.comment(Number(c.req.param('id')))
    const article = store.articleRow(c.req.param('slug'))

    // Only the author of a comment may delete it
    if (!comment || !article || comment.article_id !== article.id || comment.author_id !== currentUser(c).id) {
      return notFound(c)
    }

    store.deleteComment(comment.id)
    return back(c)
  })

  return routes
}
