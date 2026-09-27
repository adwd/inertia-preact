import { Hono } from 'hono'
import type { ArticleInput, Store } from '../db.ts'
import type { Env } from '../session.ts'
import { type Errors, formInput, text, textList, validate } from '../validation.ts'
import { type AppContext, auth, currentUser, hasErrors, notFound, ownArticle, withErrors } from './helpers.ts'

async function articleInput(c: AppContext): Promise<[ArticleInput, Errors]> {
  const input = await formInput(c)
  const article = {
    title: text(input.title),
    description: text(input.description),
    body: text(input.body),
    tagList: [...new Set(textList(input.tagList))],
  }

  return [
    article,
    validate([
      ['title', article.title === '', "title can't be blank"],
      ['title', article.title.length > 200, 'title is too long (maximum is 200 characters)'],
      ['description', article.description === '', "description can't be blank"],
      ['body', article.body === '', "body can't be blank"],
      ['tagList', article.tagList.length > 10, 'tagList is too long (maximum is 10 tags)'],
      ['tagList', article.tagList.some((tag) => tag.length > 30), 'tags are too long (maximum is 30 characters)'],
    ]),
  ]
}

/** Writing and editing articles */
export function editorRoutes(store: Store) {
  const routes = new Hono<Env>()

  routes.get('/editor', auth, (c) => c.render('Editor', { article: null }))

  routes.post('/editor', auth, async (c) => {
    const [input, errors] = await articleInput(c)

    if (hasErrors(errors)) {
      return withErrors(c, errors)
    }

    const slug = store.createArticle(currentUser(c).id, input)
    return c.redirect(`/article/${slug}`, 303)
  })

  routes.get('/editor/:slug', auth, (c) => {
    const article = ownArticle(store, c)

    if (!article) {
      return notFound(c)
    }

    const tagList = store.tagsOf([article.id]).get(article.id) ?? []
    const { slug, title, description, body } = article

    return c.render('Editor', { article: { slug, title, description, body, tagList } })
  })

  routes.put('/editor/:slug', auth, async (c) => {
    const article = ownArticle(store, c)

    if (!article) {
      return notFound(c)
    }

    const [input, errors] = await articleInput(c)

    if (hasErrors(errors)) {
      return withErrors(c, errors)
    }

    const slug = store.updateArticle(article, input)
    return c.redirect(`/article/${slug}`, 303)
  })

  return routes
}
