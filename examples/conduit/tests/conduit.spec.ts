import { expect, type Page, test } from '@playwright/test'

// The selectors follow the RealWorld E2E selectors contract. The tests run in parallel against one server:
// each creates its own user, and uses demo content that the other tests don't change.

const PASSWORD = 'secret-password'

function uniqueUser() {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
  return { username: `user_${id}`, email: `${id}@example.com`, password: PASSWORD }
}

/** Signs up a new user, in the browser context of the page */
async function signUp(page: Page) {
  const user = uniqueUser()
  const response = await page.request.post('/register', { data: user })
  expect(response.ok()).toBe(true)
  return user
}

async function createArticle(page: Page, article: { title: string; body: string; tagList?: string[] }) {
  const response = await page.request.post('/editor', {
    data: { description: 'A test article', tagList: [], ...article },
  })
  expect(response.ok()).toBe(true)
  return new URL(response.url()).pathname
}

test('renders the home page on the server, and loads the popular tags after', async ({ page, request }) => {
  const html = await (await request.get('/')).text()
  expect(html).toContain('data-server-rendered')
  expect(html).toContain('class="article-preview"')
  expect(html).toContain('Loading tags...')

  await page.goto('/')
  await expect(page.locator('.feed-toggle .nav-link.active')).toHaveText('Global Feed')
  await expect(page.locator('.article-preview')).toHaveCount(10)
  await expect(page.locator('.sidebar .tag-pill').first()).toBeVisible()
})

test('signs up with validation errors from the server, and signs out', async ({ page }) => {
  const user = uniqueUser()

  await page.goto('/register')
  await page.fill('input[name="username"]', 'jake')
  await page.fill('input[name="email"]', user.email)
  await page.fill('input[name="password"]', user.password)
  await page.click('button:has-text("Sign up")')
  await expect(page.locator('.error-messages')).toHaveText('username has already been taken')
  await expect(page.locator('input[name="password"]')).toHaveValue('')

  await page.fill('input[name="username"]', user.username)
  await page.fill('input[name="password"]', user.password)
  await page.click('button:has-text("Sign up")')
  await expect(page).toHaveURL('/')
  await expect(page.locator('.navbar')).toContainText(user.username)
  await expect(page.locator('.feed-toggle')).toContainText('Your Feed')

  await page.click('a.nav-link:has-text("Settings")')
  await page.click('button:has-text("Or click here to logout")')
  await expect(page).toHaveURL('/')
  await expect(page.locator('.navbar')).toContainText('Sign in')
  await expect(page.locator('.navbar')).not.toContainText(user.username)
})

test('signs in, keeping the email after a failed attempt', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[name="email"]', 'jake@example.com')
  await page.fill('input[name="password"]', 'wrong-password')
  await page.click('button:has-text("Sign in")')
  await expect(page.locator('.error-messages')).toHaveText('email or password is invalid')
  await expect(page.locator('input[name="email"]')).toHaveValue('jake@example.com')

  await page.fill('input[name="password"]', 'password123')
  await page.click('button:has-text("Sign in")')
  await expect(page).toHaveURL('/')
  await expect(page.locator('.navbar')).toContainText('jake')
})

test('writes, edits and deletes an article', async ({ page }) => {
  await signUp(page)
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
  const tag = `e2e-${id}`

  await page.goto('/')
  await page.click('a.nav-link:has-text("New Article")')
  await expect(page).toHaveURL('/editor')
  await page.fill('input[name="title"]', `An article ${id}`)
  await page.fill('input[name="description"]', 'Written by Playwright')
  await page.fill('textarea[name="body"]', '## A heading\n\nSome **bold** text.')
  await page.fill('input[placeholder="Enter tags"]', tag)
  await page.press('input[placeholder="Enter tags"]', 'Enter')
  await page.fill('input[placeholder="Enter tags"]', 'playwright')
  await page.press('input[placeholder="Enter tags"]', 'Enter')
  await expect(page.locator('.tag-list .tag-pill')).toHaveText([tag, 'playwright'])
  await page.click('button:has-text("Publish Article")')

  await expect(page).toHaveURL(`/article/an-article-${id}`)
  await expect(page.locator('.banner h1')).toHaveText(`An article ${id}`)
  await expect(page.locator('.article-content h2')).toHaveText('A heading')
  await expect(page.locator('.article-content strong')).toHaveText('bold')
  await expect(page.locator('.article-content .tag-list li')).toHaveText([tag, 'playwright'])

  await page.locator('a:has-text("Edit Article")').first().click()
  await expect(page.locator('input[name="title"]')).toHaveValue(`An article ${id}`)
  await page.fill('input[name="title"]', `An edited article ${id}`)
  await page.click('button:has-text("Publish Article")')
  await expect(page).toHaveURL(`/article/an-edited-article-${id}`)

  page.once('dialog', (dialog) => dialog.accept())
  await page.locator('button:has-text("Delete Article")').first().click()
  await expect(page).toHaveURL('/')
  expect((await page.request.get(`/article/an-edited-article-${id}`)).status()).toBe(404)
})

test('shows Markdown without running the HTML in it', async ({ page }) => {
  await signUp(page)
  let dialogs = 0
  page.on('dialog', (dialog) => {
    dialogs++
    return dialog.dismiss()
  })

  const url = await createArticle(page, {
    title: `Unsafe markdown ${Date.now()}`,
    body: `<script>alert('xss')</script>\n\n<img src=x onerror="alert('xss')">\n\n[link](javascript:alert('xss'))`,
  })

  await page.goto(url)
  const content = page.locator('.article-content')
  await expect(content).toContainText("<script>alert('xss')</script>")
  await expect(content.locator('script, img')).toHaveCount(0)
  await expect(content.locator('a')).toHaveCount(0)
  await expect(content).toContainText('link')
  expect(dialogs).toBe(0)
})

test('comments on an article', async ({ page }) => {
  await signUp(page)
  const url = await createArticle(page, { title: `Commented ${Date.now()}`, body: 'Comment on this.' })
  const comments = page.locator('.card:not(.comment-form) .card-block')

  await page.goto(url)
  await page.click('button:has-text("Post Comment")')
  await expect(page.locator('.error-messages')).toHaveText("body can't be blank")

  await page.fill('textarea[placeholder="Write a comment..."]', 'A comment with <b>markup</b>')
  await page.click('button:has-text("Post Comment")')
  await expect(comments).toHaveText(['A comment with <b>markup</b>'])
  await expect(page.locator('textarea[placeholder="Write a comment..."]')).toHaveValue('')
  await expect(page.locator('.error-messages')).toHaveCount(0)

  await page.click('.mod-options .ion-trash-a')
  await expect(comments).toHaveCount(0)
})

test('favorites an article right away, and keeps it', async ({ page }) => {
  await signUp(page)
  // The articles of an author the other tests leave alone
  await page.goto('/profile/linus')

  const button = page.locator('.article-preview').first().locator('.btn')
  const count = Number((await button.textContent())?.trim())
  await expect(button).toHaveClass(/btn-outline-primary/)

  await button.click()
  await expect(button).toHaveClass(/btn-primary/)
  await expect(button).toHaveText(String(count + 1))

  await page.reload()
  await expect(button).toHaveClass(/btn-primary/)
  await expect(button).toHaveText(String(count + 1))

  await page.locator('.articles-toggle a:has-text("Favorited")').click()
  await expect(page).toHaveURL('/profile/linus/favorites')

  await page.goto('/profile/linus')
  await button.click()
  await expect(button).toHaveClass(/btn-outline-primary/)
  await expect(button).toHaveText(String(count))
})

test("follows an author, whose articles then make up the user's feed", async ({ page }) => {
  await signUp(page)

  await page.goto('/?feed=following')
  await expect(page.locator('.empty-feed-message')).toBeVisible()

  await page.goto('/profile/grace')
  await page.click('button:has-text("Follow grace")')
  await expect(page.locator('.user-info button')).toContainText('Unfollow grace')

  await page.goto('/')
  await page.click('.feed-toggle a:has-text("Your Feed")')
  await expect(page).toHaveURL('/?feed=following')
  await expect(page.locator('.article-preview').first()).toBeVisible()
  await expect(page.locator('.article-preview .author')).toHaveText(
    Array(await page.locator('.article-preview').count()).fill('grace'),
  )
})

test('filters by tag and paginates, reloading the articles only', async ({ page }) => {
  // Other tests add tags: compare with the tags shown before each visit
  const tags = page.locator('.sidebar .tag-pill')
  async function shownTags() {
    await expect(tags.first()).toBeVisible()
    return tags.allTextContents()
  }

  await page.goto('/')
  let before = await shownTags()

  const request = page.waitForRequest((request) => request.url().endsWith('/tag/inertia'))
  await tags.filter({ hasText: /^inertia$/ }).click()
  expect((await request).headers()['x-inertia-partial-data']).toBe('tab,articles')

  await expect(page).toHaveURL('/tag/inertia')
  await expect(page.locator('.feed-toggle .nav-link.active')).toHaveText('inertia')
  for (const preview of await page.locator('.article-preview').all()) {
    await expect(preview.locator('.tag-list')).toContainText('inertia')
  }
  await expect(tags).toHaveText(before)

  await page.goto('/')
  before = await shownTags()
  await page.locator('.page-link', { hasText: /^2$/ }).click()
  await expect(page).toHaveURL('/?page=2')
  await expect(page.locator('.page-item.active')).toHaveText('2')
  await expect(tags).toHaveText(before)
})

test('updates the settings', async ({ page }) => {
  const user = await signUp(page)

  await page.goto('/settings')
  await expect(page.locator('input[name="email"]')).toHaveValue(user.email)
  await page.fill('textarea[name="bio"]', 'Testing Conduit')
  await page.click('button:has-text("Update Settings")')

  await expect(page).toHaveURL(`/profile/${user.username}`)
  await expect(page.locator('.user-info p')).toHaveText('Testing Conduit')
  await expect(page.locator('.user-info')).toContainText('Edit Profile Settings')
})

test('keeps guests out of the pages and actions of signed-in users', async ({ page }) => {
  await page.goto('/editor')
  await expect(page).toHaveURL('/login')

  await page.goto('/settings')
  await expect(page).toHaveURL('/login')

  await page.goto('/profile/margaret')
  await page.locator('.article-preview .btn').first().click()
  await expect(page).toHaveURL('/login')

  // Only authors may edit their articles
  await signUp(page)
  const response = await page.goto('/editor/how-to-train-your-dragon')
  expect(response?.status()).toBe(404)
})

test('rejects form submissions from other sites', async ({ request }) => {
  const response = await request.post('/login', {
    form: { email: 'jake@example.com', password: 'password123' },
    headers: { Origin: 'https://attacker.example' },
    maxRedirects: 0,
  })

  expect(response.status()).toBe(403)
})

test('shows a not found page', async ({ page }) => {
  const response = await page.goto('/article/does-not-exist')

  expect(response?.status()).toBe(404)
  await expect(page.locator('h1')).toHaveText('404')
})
