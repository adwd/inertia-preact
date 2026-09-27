import { randomBytes } from 'node:crypto'
import { defer } from '@hono/inertia'
import { Hono, type Context } from 'hono'
import { csrf } from 'hono/csrf'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import type { FeedTab } from '../src/types.ts'
import type { ArticleFilter, ArticleInput, Store, UserRow } from './db.ts'
import { type Assets, inertiaPages } from './inertia.ts'
import { renderMarkdown } from './markdown.ts'
import { hashPassword, verifyPassword } from './password.ts'
import { type Env, sessions } from './session.ts'
import { type Errors, formInput, isEmail, isHttpUrl, text, textList, validate } from './validation.ts'

export interface AppOptions {
  store: Store
  assets: Assets
}

type AppContext = Context<Env>

/** Back to the page the request came from, e.g. to show validation errors */
function back(c: AppContext, fallback = '/') {
  const referer = c.req.header('Referer')
  const url = referer ? new URL(referer, c.req.url) : null
  const sameOrigin = url && url.origin === new URL(c.req.url).origin

  return c.redirect(sameOrigin ? url.pathname + url.search : fallback, 303)
}

function withErrors(c: AppContext, errors: Errors) {
  c.get('session').flashNext({ errors })
  return back(c)
}

const hasErrors = (errors: Errors) => Object.keys(errors).length > 0

const pageNumber = (c: AppContext) => {
  const page = Number.parseInt(c.req.query('page') ?? '1', 10)
  return Number.isSafeInteger(page) && page > 0 ? page : 1
}

const auth = createMiddleware<Env>(async (c, next) => {
  if (!c.get('user')) {
    return c.redirect('/login', 303)
  }

  await next()
})

/** The signed-in user, in the routes behind `auth` */
function currentUser(c: AppContext): UserRow {
  const user = c.get('user')

  if (!user) {
    throw new Error('Not signed in')
  }

  return user
}

const guest = createMiddleware<Env>(async (c, next) => {
  if (c.get('user')) {
    return c.redirect('/', 303)
  }

  await next()
})

export function createApp({ store, assets }: AppOptions) {
  const app = new Hono<Env>()
  const unknownUserHash = hashPassword(randomBytes(16).toString('hex'))

  // Forms are submitted by Inertia with fetch: reject requests from other sites
  app.use(csrf())
  app.use(sessions(store))
  app.use(inertiaPages(assets))

  const viewerId = (c: AppContext) => c.get('user')?.id ?? null

  const notFound = (c: AppContext) => {
    c.status(404)
    return c.render('Error', { status: 404 })
  }

  // Home: the global feed, the feed of followed authors, or the articles with a tag

  const home = (c: AppContext, tab: FeedTab, filter: ArticleFilter) =>
    c.render('Home', {
      tab,
      articles: store.articles(filter, pageNumber(c), viewerId(c)),
      // Loaded after the page is shown: it doesn't change with the tab or the page, and is kept by the visits
      // reloading only the articles
      tags: defer(() => store.popularTags()),
    })

  app.get('/', (c) => {
    if (c.req.query('feed') === 'following') {
      const user = c.get('user')
      return user ? home(c, { type: 'following' }, { feedOf: user.id }) : c.redirect('/login')
    }

    return home(c, { type: 'global' }, {})
  })

  app.get('/tag/:tag', (c) => home(c, { type: 'tag', tag: c.req.param('tag') }, { tag: c.req.param('tag') }))

  // Authentication

  app.get('/login', guest, (c) => c.render('Auth/Login', {}))

  app.post('/login', guest, async (c) => {
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

  app.get('/register', guest, (c) => c.render('Auth/Register', {}))

  app.post('/register', guest, async (c) => {
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

  app.post('/logout', (c) => {
    c.get('session').logout()
    return c.redirect('/', 303)
  })

  // Settings

  app.get('/settings', auth, (c) => c.render('Settings', {}))

  app.put('/settings', auth, async (c) => {
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

  // Editor

  const articleInput = async (c: AppContext): Promise<[ArticleInput, Errors]> => {
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

  app.get('/editor', auth, (c) => c.render('Editor', { article: null }))

  app.post('/editor', auth, async (c) => {
    const [input, errors] = await articleInput(c)

    if (hasErrors(errors)) {
      return withErrors(c, errors)
    }

    const slug = store.createArticle(currentUser(c).id, input)
    return c.redirect(`/article/${slug}`, 303)
  })

  // Only the author may edit an article
  const ownArticle = (c: AppContext) => {
    const article = store.articleRow(c.req.param('slug')!)
    return article && article.author_id === c.get('user')?.id ? article : undefined
  }

  app.get('/editor/:slug', auth, (c) => {
    const article = ownArticle(c)

    if (!article) {
      return notFound(c)
    }

    const tagList = store.tagsOf([article.id]).get(article.id) ?? []
    const { slug, title, description, body } = article

    return c.render('Editor', { article: { slug, title, description, body, tagList } })
  })

  app.put('/editor/:slug', auth, async (c) => {
    const article = ownArticle(c)

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

  // Articles

  app.get('/article/:slug', (c) => {
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

  app.delete('/article/:slug', auth, (c) => {
    const article = ownArticle(c)

    if (!article) {
      return notFound(c)
    }

    store.deleteArticle(article.id)
    return c.redirect('/', 303)
  })

  app.post('/article/:slug/favorite', auth, (c) => {
    const article = store.articleRow(c.req.param('slug'))

    if (!article) {
      return notFound(c)
    }

    store.favorite(currentUser(c).id, article.id)
    return back(c)
  })

  app.delete('/article/:slug/favorite', auth, (c) => {
    const article = store.articleRow(c.req.param('slug'))

    if (!article) {
      return notFound(c)
    }

    store.unfavorite(currentUser(c).id, article.id)
    return back(c)
  })

  // Comments

  app.post('/article/:slug/comments', auth, async (c) => {
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

  app.delete('/article/:slug/comments/:id', auth, (c) => {
    const comment = store.comment(Number(c.req.param('id')))
    const article = store.articleRow(c.req.param('slug'))

    // Only the author of a comment may delete it
    if (!comment || !article || comment.article_id !== article.id || comment.author_id !== currentUser(c).id) {
      return notFound(c)
    }

    store.deleteComment(comment.id)
    return back(c)
  })

  // Profiles

  const profile = (c: AppContext, tab: 'articles' | 'favorites') => {
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

  app.get('/profile/:username', (c) => profile(c, 'articles'))
  app.get('/profile/:username/favorites', (c) => profile(c, 'favorites'))

  const followee = (c: AppContext) => {
    const user = store.userByUsername(c.req.param('username')!)
    return user && user.id !== c.get('user')?.id ? user : undefined
  }

  app.post('/profile/:username/follow', auth, (c) => {
    const user = followee(c)

    if (!user) {
      return notFound(c)
    }

    store.follow(currentUser(c).id, user.id)
    return back(c)
  })

  app.delete('/profile/:username/follow', auth, (c) => {
    const user = followee(c)

    if (!user) {
      return notFound(c)
    }

    store.unfollow(currentUser(c).id, user.id)
    return back(c)
  })

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
