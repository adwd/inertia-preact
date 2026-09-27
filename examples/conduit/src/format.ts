/** The image of a user, or the default avatar */
export function avatar(image: string | null) {
  return image || '/default-avatar.svg'
}

/** A date like "January 20, 2026", the same on the server and in any browser */
export function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export function profileUrl(username: string) {
  return `/profile/${encodeURIComponent(username)}`
}

export function articleUrl(slug: string) {
  return `/article/${encodeURIComponent(slug)}`
}

export function tagUrl(tag: string) {
  return `/tag/${encodeURIComponent(tag)}`
}
