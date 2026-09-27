import { router, usePage } from '@adwd/inertia-preact'
import type { Article, ArticlePreview, Paginated, Profile } from '../types.ts'

// Favoriting and following. The server makes the change and redirects back, and the page reloads the props
// that may have changed. The change is shown right away (optimistically), and rolled back if the request
// fails. Guests are sent to the login page by the server.

type Props = Record<string, unknown>

function updateArticles(props: Props, update: (article: ArticlePreview) => ArticlePreview | undefined) {
  const changes: Props = {}
  const article = props.article as Article | undefined
  const articles = props.articles as Paginated<ArticlePreview> | undefined

  if (article) {
    const updated = update(article)

    if (updated) {
      changes.article = updated
    }
  }

  if (articles) {
    changes.articles = { ...articles, data: articles.data.map((article) => update(article) ?? article) }
  }

  return changes
}

function withFollowing(author: Profile, username: string, following: boolean) {
  return author.username === username ? { ...author, following } : author
}

function useSignedIn() {
  return usePage().props.auth.user !== null
}

export function FavoriteButton({ article, compact = false }: { article: ArticlePreview; compact?: boolean }) {
  const signedIn = useSignedIn()
  const { slug, favorited, favoritesCount } = article

  function toggle() {
    const favorite = !favorited

    router.visit(`/article/${encodeURIComponent(slug)}/favorite`, {
      method: favorite ? 'post' : 'delete',
      preserveScroll: true,
      preserveState: true,
      only: ['article', 'articles'],
      optimistic: signedIn
        ? (props) =>
            updateArticles(props, (candidate) =>
              candidate.slug === slug
                ? {
                    ...candidate,
                    favorited: favorite,
                    favoritesCount: candidate.favoritesCount + (favorite ? 1 : -1),
                  }
                : undefined,
            )
        : undefined,
    })
  }

  const className = `btn btn-sm ${favorited ? 'btn-primary' : 'btn-outline-primary'}`

  if (compact) {
    return (
      <button type="button" class={`${className} pull-xs-right`} onClick={toggle}>
        <i class="ion-heart" /> {favoritesCount}
      </button>
    )
  }

  return (
    <button type="button" class={className} onClick={toggle}>
      <i class="ion-heart" />
      &nbsp; {favorited ? 'Unfavorite' : 'Favorite'} Article <span class="counter">({favoritesCount})</span>
    </button>
  )
}

export function FollowButton({ profile, class: extraClass = '' }: { profile: Profile; class?: string }) {
  const signedIn = useSignedIn()
  const { username, following } = profile

  function toggle() {
    const follow = !following

    router.visit(`/profile/${encodeURIComponent(username)}/follow`, {
      method: follow ? 'post' : 'delete',
      preserveScroll: true,
      preserveState: true,
      only: ['profile', 'article', 'articles'],
      optimistic: signedIn
        ? (props) => ({
            ...(props.profile ? { profile: withFollowing(props.profile as Profile, username, follow) } : {}),
            ...updateArticles(props, (article) =>
              article.author.username === username
                ? { ...article, author: withFollowing(article.author, username, follow) }
                : undefined,
            ),
          })
        : undefined,
    })
  }

  return (
    <button
      type="button"
      class={`btn btn-sm ${following ? 'btn-secondary' : 'btn-outline-secondary'} ${extraClass}`.trim()}
      onClick={toggle}
    >
      <i class="ion-plus-round" />
      &nbsp; {following ? 'Unfollow' : 'Follow'} {username}
    </button>
  )
}
