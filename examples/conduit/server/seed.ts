import type { Store } from './db.ts'
import { hashPassword } from './password.ts'

/** The password of the demo users */
export const DEMO_PASSWORD = 'password123'

const users = [
  { username: 'jake', bio: 'I work at statefarm', image: null },
  { username: 'ada', bio: 'Analytical engines and the poetry of science', image: null },
  { username: 'grace', bio: 'It is easier to ask forgiveness than it is to get permission.', image: null },
  { username: 'linus', bio: 'Talk is cheap. Show me the code.', image: null },
  { username: 'margaret', bio: 'Software engineering, before it had a name.', image: null },
]

const topics = [
  {
    title: 'How to train your dragon',
    description: 'Ever wonder how?',
    tags: ['dragons', 'training'],
    body: `It takes a Jacobian.

## Getting started

Dragons are *stubborn* creatures, so start small:

1. Earn its trust
2. Feed it well
3. Never skip leg day

> A dragon never forgets a kindness.`,
  },
  {
    title: 'Server-driven single-page apps',
    description: 'Routing and data loading belong to the server.',
    tags: ['inertia', 'architecture', 'hono'],
    body: `With Inertia, the server decides which **page** to render and with which **props**.
The client only renders them, and turns links and forms into requests for the next page.

- No client-side router
- No API to design for your own frontend
- Validation, authorization and data loading stay on the server`,
  },
  {
    title: 'Why Preact is still worth a look',
    description: 'Three kilobytes can go a long way.',
    tags: ['preact', 'performance'],
    body: `Preact offers the familiar component model in a fraction of the size.

\`\`\`tsx
export default function Hello({ name }: { name: string }) {
  return <h1>Hello, {name}!</h1>
}
\`\`\``,
  },
  {
    title: 'Writing Markdown that renders safely',
    description: 'Untrusted content deserves a careful renderer.',
    tags: ['security', 'markdown'],
    body: `Raw HTML such as <script>alert('xss')</script> is shown as text, and links like
[this one](javascript:alert('xss')) lose their dangerous URL.

Regular [links](https://realworld.show) keep working.`,
  },
  {
    title: 'The joy of small, boring tools',
    description: 'Fewer moving parts, fewer surprises.',
    tags: ['architecture', 'productivity'],
    body: `A SQLite file, a web framework and a template: most applications need little more.

Boring tools let you focus on the problem instead of the plumbing.`,
  },
  {
    title: 'Pagination without the pain',
    description: 'Keep the page in the URL.',
    tags: ['inertia', 'ux'],
    body: `When the page number lives in the URL, reloading, sharing and the back button just work.

Inertia partial reloads then fetch only the list, not the rest of the page.`,
  },
  {
    title: 'Deferred props in practice',
    description: 'Show the page first, load the slow parts after.',
    tags: ['inertia', 'performance'],
    body: `Some data is expensive, or simply less important. Deferred props let the page appear right away,
and load that data with a follow-up request.`,
  },
  {
    title: 'A field guide to optimistic updates',
    description: 'Update first, confirm later.',
    tags: ['ux', 'inertia'],
    body: `Favoriting an article shouldn't wait for a round trip. Show the result immediately,
and roll back if the server disagrees.`,
  },
]

// Deterministic pseudo-random numbers, so every start has the same content
function random(seed: number) {
  let state = seed

  return () => {
    state = (state * 1103515245 + 12345) % 2 ** 31
    return state / 2 ** 31
  }
}

/** Fills an empty store with demo users, articles, comments, favorites and follows */
export async function seed(store: Store) {
  if (store.userByUsername('jake')) {
    return
  }

  const next = random(42)
  const passwordHash = await hashPassword(DEMO_PASSWORD)
  const ids = users.map((user) => store.createUser({ ...user, email: `${user.username}@example.com`, passwordHash }))
  const start = Date.UTC(2026, 0, 5, 9)
  const articleIds: number[] = []

  // Three rounds of the topics, so the feeds have several pages
  for (let round = 0; round < 3; round++) {
    topics.forEach((topic, index) => {
      const n = round * topics.length + index
      const authorId = ids[(index + round) % ids.length]
      const title = round === 0 ? topic.title : `${topic.title} (part ${round + 1})`
      const createdAt = new Date(start + n * 26 * 60 * 60 * 1000).toISOString()
      const slug = store.createArticle(authorId, { ...topic, title, tagList: topic.tags }, createdAt)

      articleIds.push(store.articleRow(slug)!.id)
    })
  }

  store.transaction(() => {
    for (const articleId of articleIds) {
      for (const userId of ids) {
        if (next() < 0.4) {
          store.favorite(userId, articleId)
        }
      }
    }

    for (const follower of ids) {
      for (const followee of ids) {
        if (follower !== followee && next() < 0.5) {
          store.follow(follower, followee)
        }
      }
    }
  })

  const comments = [
    'Great article, thanks for sharing!',
    'I tried this and it worked on the first attempt.',
    'Could you write a follow-up on this?',
    'This changed how I think about the problem.',
  ]

  articleIds.slice(-6).forEach((articleId, index) => {
    const createdAt = new Date(Date.UTC(2026, 1, 1 + index, 12)).toISOString()
    store.addComment(articleId, ids[(index + 1) % ids.length], comments[index % comments.length], createdAt)
  })
}
