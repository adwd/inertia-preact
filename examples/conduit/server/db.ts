import { randomBytes } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import type { ArticlePreview, Comment, Paginated, Profile } from '../src/types.ts'

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    bio TEXT,
    image TEXT
  );
  CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (follower_id, followee_id)
  );
  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    body TEXT NOT NULL,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS article_tags (
    article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    position INTEGER NOT NULL,
    PRIMARY KEY (article_id, tag)
  );
  CREATE INDEX IF NOT EXISTS article_tags_tag ON article_tags(tag);
  CREATE TABLE IF NOT EXISTS favorites (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, article_id)
  );
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY,
    body TEXT NOT NULL,
    article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    flash TEXT,
    expires_at TEXT NOT NULL
  );
`

export const PER_PAGE = 10

export interface UserRow {
  id: number
  username: string
  email: string
  password_hash: string
  bio: string | null
  image: string | null
}

export interface ArticleRow {
  id: number
  slug: string
  title: string
  description: string
  body: string
  author_id: number
}

export interface SessionRow {
  id: string
  user_id: number | null
  flash: string | null
}

export interface ArticleFilter {
  tag?: string
  author?: string
  favoritedBy?: string
  /** The articles of the authors the user follows */
  feedOf?: number
}

export interface ArticleInput {
  title: string
  description: string
  body: string
  tagList: string[]
}

type Row = Record<string, unknown>

// The columns of a profile, as seen by the viewer (`$viewer`, null for guests)
function profileColumns(user: string) {
  return `
    ${user}.username AS username, ${user}.bio AS bio, ${user}.image AS image,
    EXISTS (SELECT 1 FROM follows WHERE follower_id = $viewer AND followee_id = ${user}.id) AS following
  `
}

function toProfile(row: Row): Profile {
  return {
    username: row.username as string,
    bio: row.bio as string | null,
    image: row.image as string | null,
    following: row.following === 1,
  }
}

export function slugify(title: string) {
  const slug = title
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '')

  return slug || 'article'
}

export class Store {
  readonly db: DatabaseSync

  constructor(path = ':memory:') {
    this.db = new DatabaseSync(path)
    this.db.exec('PRAGMA foreign_keys = ON')
    this.db.exec(SCHEMA)
  }

  transaction<T>(callback: () => T): T {
    this.db.exec('BEGIN')

    try {
      const result = callback()
      this.db.exec('COMMIT')
      return result
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }

  // Users

  userById(id: number) {
    return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined
  }

  userByEmail(email: string) {
    return this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined
  }

  userByUsername(username: string) {
    return this.db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined
  }

  isUsernameTaken(username: string, exceptId: number | null = null) {
    const row = this.db.prepare('SELECT id FROM users WHERE username = ? AND id IS NOT ?').get(username, exceptId)
    return row !== undefined
  }

  isEmailTaken(email: string, exceptId: number | null = null) {
    return this.db.prepare('SELECT id FROM users WHERE email = ? AND id IS NOT ?').get(email, exceptId) !== undefined
  }

  createUser(user: {
    username: string
    email: string
    passwordHash: string
    bio?: string | null
    image?: string | null
  }) {
    const { lastInsertRowid } = this.db
      .prepare('INSERT INTO users (username, email, password_hash, bio, image) VALUES (?, ?, ?, ?, ?)')
      .run(user.username, user.email, user.passwordHash, user.bio ?? null, user.image ?? null)

    return Number(lastInsertRowid)
  }

  updateUser(
    id: number,
    user: { username: string; email: string; bio: string | null; image: string | null; passwordHash?: string },
  ) {
    this.db
      .prepare(
        `UPDATE users SET username = ?, email = ?, bio = ?, image = ?, password_hash = COALESCE(?, password_hash)
         WHERE id = ?`,
      )
      .run(user.username, user.email, user.bio, user.image, user.passwordHash ?? null, id)
  }

  profile(username: string, viewerId: number | null) {
    const row = this.db
      .prepare(`SELECT u.id AS id, ${profileColumns('u')} FROM users u WHERE u.username = $username`)
      .get({ $username: username, $viewer: viewerId }) as Row | undefined

    return row && { id: row.id as number, profile: toProfile(row) }
  }

  follow(followerId: number, followeeId: number) {
    this.db
      .prepare('INSERT OR IGNORE INTO follows (follower_id, followee_id) VALUES (?, ?)')
      .run(followerId, followeeId)
  }

  unfollow(followerId: number, followeeId: number) {
    this.db.prepare('DELETE FROM follows WHERE follower_id = ? AND followee_id = ?').run(followerId, followeeId)
  }

  // Articles

  articles(filter: ArticleFilter, page: number, viewerId: number | null): Paginated<ArticlePreview> {
    const conditions: string[] = []
    const params: Record<string, string | number | null> = {}

    if (filter.tag !== undefined) {
      conditions.push('EXISTS (SELECT 1 FROM article_tags t WHERE t.article_id = a.id AND t.tag = $tag)')
      params.$tag = filter.tag
    }

    if (filter.author !== undefined) {
      conditions.push('author.username = $author')
      params.$author = filter.author
    }

    if (filter.favoritedBy !== undefined) {
      conditions.push(`EXISTS (SELECT 1 FROM favorites f JOIN users fu ON fu.id = f.user_id
        WHERE f.article_id = a.id AND fu.username = $favoritedBy)`)
      params.$favoritedBy = filter.favoritedBy
    }

    if (filter.feedOf !== undefined) {
      conditions.push('author.id IN (SELECT followee_id FROM follows WHERE follower_id = $feedOf)')
      params.$feedOf = filter.feedOf
    }

    const from = `FROM articles a JOIN users author ON author.id = a.author_id
      ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''}`

    const { count } = this.db.prepare(`SELECT COUNT(*) AS count ${from}`).get(params) as { count: number }
    const lastPage = Math.max(1, Math.ceil(count / PER_PAGE))
    const currentPage = Math.min(Math.max(1, page), lastPage)

    const rows = this.db
      .prepare(
        `SELECT a.id, a.slug, a.title, a.description, a.created_at,
           ${profileColumns('author')},
           (SELECT COUNT(*) FROM favorites WHERE article_id = a.id) AS favorites_count,
           EXISTS (SELECT 1 FROM favorites WHERE article_id = a.id AND user_id = $viewer) AS favorited
         ${from}
         ORDER BY a.created_at DESC, a.id DESC
         LIMIT $limit OFFSET $offset`,
      )
      .all({ ...params, $viewer: viewerId, $limit: PER_PAGE, $offset: (currentPage - 1) * PER_PAGE }) as Row[]

    const tags = this.tagsOf(rows.map((row) => row.id as number))

    return {
      data: rows.map((row) => ({
        slug: row.slug as string,
        title: row.title as string,
        description: row.description as string,
        tagList: tags.get(row.id as number) ?? [],
        createdAt: row.created_at as string,
        favorited: row.favorited === 1,
        favoritesCount: row.favorites_count as number,
        author: toProfile(row),
      })),
      currentPage,
      lastPage,
    }
  }

  article(slug: string, viewerId: number | null) {
    const row = this.db
      .prepare(
        `SELECT a.*, ${profileColumns('author')},
           (SELECT COUNT(*) FROM favorites WHERE article_id = a.id) AS favorites_count,
           EXISTS (SELECT 1 FROM favorites WHERE article_id = a.id AND user_id = $viewer) AS favorited
         FROM articles a JOIN users author ON author.id = a.author_id
         WHERE a.slug = $slug`,
      )
      .get({ $slug: slug, $viewer: viewerId }) as Row | undefined

    if (!row) {
      return undefined
    }

    return {
      row: row as unknown as ArticleRow,
      preview: {
        slug: row.slug as string,
        title: row.title as string,
        description: row.description as string,
        tagList: this.tagsOf([row.id as number]).get(row.id as number) ?? [],
        createdAt: row.created_at as string,
        favorited: row.favorited === 1,
        favoritesCount: row.favorites_count as number,
        author: toProfile(row),
      } satisfies ArticlePreview,
    }
  }

  articleRow(slug: string) {
    return this.db.prepare('SELECT * FROM articles WHERE slug = ?').get(slug) as ArticleRow | undefined
  }

  tagsOf(articleIds: number[]) {
    const tags = new Map<number, string[]>()

    if (articleIds.length > 0) {
      const rows = this.db
        .prepare(
          `SELECT article_id, tag FROM article_tags WHERE article_id IN (${articleIds.map(() => '?').join(',')})
           ORDER BY position`,
        )
        .all(...articleIds) as Array<{ article_id: number; tag: string }>

      for (const { article_id, tag } of rows) {
        tags.set(article_id, [...(tags.get(article_id) ?? []), tag])
      }
    }

    return tags
  }

  createArticle(authorId: number, input: ArticleInput, createdAt = new Date().toISOString()) {
    return this.transaction(() => {
      const slug = this.uniqueSlug(input.title)
      const { lastInsertRowid } = this.db
        .prepare(
          `INSERT INTO articles (slug, title, description, body, author_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(slug, input.title, input.description, input.body, authorId, createdAt, createdAt)

      this.setTags(Number(lastInsertRowid), input.tagList)

      return slug
    })
  }

  updateArticle(article: ArticleRow, input: ArticleInput) {
    return this.transaction(() => {
      const slug = input.title === article.title ? article.slug : this.uniqueSlug(input.title)

      this.db
        .prepare('UPDATE articles SET slug = ?, title = ?, description = ?, body = ?, updated_at = ? WHERE id = ?')
        .run(slug, input.title, input.description, input.body, new Date().toISOString(), article.id)

      this.setTags(article.id, input.tagList)

      return slug
    })
  }

  deleteArticle(id: number) {
    this.db.prepare('DELETE FROM articles WHERE id = ?').run(id)
  }

  favorite(userId: number, articleId: number) {
    this.db.prepare('INSERT OR IGNORE INTO favorites (user_id, article_id) VALUES (?, ?)').run(userId, articleId)
  }

  unfavorite(userId: number, articleId: number) {
    this.db.prepare('DELETE FROM favorites WHERE user_id = ? AND article_id = ?').run(userId, articleId)
  }

  popularTags(limit = 20) {
    const rows = this.db
      .prepare('SELECT tag, COUNT(*) AS count FROM article_tags GROUP BY tag ORDER BY count DESC, tag LIMIT ?')
      .all(limit) as Array<{ tag: string }>

    return rows.map((row) => row.tag)
  }

  private uniqueSlug(title: string) {
    const base = slugify(title)
    let slug = base

    for (let n = 2; this.articleRow(slug); n++) {
      slug = `${base}-${n}`
    }

    return slug
  }

  private setTags(articleId: number, tagList: string[]) {
    this.db.prepare('DELETE FROM article_tags WHERE article_id = ?').run(articleId)

    const insert = this.db.prepare('INSERT OR IGNORE INTO article_tags (article_id, tag, position) VALUES (?, ?, ?)')
    tagList.forEach((tag, position) => insert.run(articleId, tag, position))
  }

  // Comments

  comments(articleId: number, viewerId: number | null): Comment[] {
    const rows = this.db
      .prepare(
        `SELECT c.id, c.body, c.created_at, c.author_id, ${profileColumns('author')}
         FROM comments c JOIN users author ON author.id = c.author_id
         WHERE c.article_id = $article
         ORDER BY c.created_at DESC, c.id DESC`,
      )
      .all({ $article: articleId, $viewer: viewerId }) as Row[]

    return rows.map((row) => ({
      id: row.id as number,
      body: row.body as string,
      createdAt: row.created_at as string,
      author: toProfile(row),
      can: { delete: row.author_id === viewerId },
    }))
  }

  comment(id: number) {
    return this.db.prepare('SELECT * FROM comments WHERE id = ?').get(id) as
      | { id: number; article_id: number; author_id: number }
      | undefined
  }

  addComment(articleId: number, authorId: number, body: string, createdAt = new Date().toISOString()) {
    this.db
      .prepare('INSERT INTO comments (body, article_id, author_id, created_at) VALUES (?, ?, ?, ?)')
      .run(body, articleId, authorId, createdAt)
  }

  deleteComment(id: number) {
    this.db.prepare('DELETE FROM comments WHERE id = ?').run(id)
  }

  // Sessions

  session(id: string) {
    return this.db.prepare("SELECT * FROM sessions WHERE id = ? AND expires_at > datetime('now')").get(id) as
      | SessionRow
      | undefined
  }

  createSession(userId: number | null, lifetimeDays: number) {
    const id = randomBytes(32).toString('base64url')

    this.db
      .prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, datetime('now', ?))")
      .run(id, userId, `+${lifetimeDays} days`)

    return id
  }

  setSessionFlash(id: string, flash: string | null) {
    this.db.prepare('UPDATE sessions SET flash = ? WHERE id = ?').run(flash, id)
  }

  deleteSession(id: string) {
    this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id)
  }

  deleteExpiredSessions() {
    this.db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run()
  }
}
