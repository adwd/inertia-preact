/** The image of a user, or the default avatar */
export const avatar = (image: string | null) => image || '/default-avatar.svg'

/** A date like "January 20, 2026", the same on the server and in any browser */
export const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

export const profileUrl = (username: string) => `/profile/${encodeURIComponent(username)}`

export const articleUrl = (slug: string) => `/article/${encodeURIComponent(slug)}`

export const tagUrl = (tag: string) => `/tag/${encodeURIComponent(tag)}`
