// The props the server sends to the pages. The server builds them from its data, and decides what the
// current user may do (`can`), so the pages only render them.

export interface Profile {
  username: string
  bio: string | null
  image: string | null
  following: boolean
}

export interface ArticlePreview {
  slug: string
  title: string
  description: string
  tagList: string[]
  createdAt: string
  favorited: boolean
  favoritesCount: number
  author: Profile
}

export interface Article extends ArticlePreview {
  /** The body, rendered from Markdown to sanitized HTML by the server */
  bodyHtml: string
  can: { edit: boolean; delete: boolean }
}

export interface Comment {
  id: number
  body: string
  createdAt: string
  author: Profile
  can: { delete: boolean }
}

export interface Paginated<T> {
  data: T[]
  currentPage: number
  lastPage: number
}

export interface CurrentUser {
  username: string
  email: string
  bio: string | null
  image: string | null
}

/** The props of every page (a type rather than an interface, so it is assignable to Inertia's page props) */
export type SharedProps = {
  auth: { user: CurrentUser | null }
  errors: Record<string, string>
}

export type FeedTab = { type: 'global' } | { type: 'following' } | { type: 'tag'; tag: string }

declare module '@inertiajs/core' {
  export interface InertiaConfig {
    sharedPageProps: SharedProps
  }
}
