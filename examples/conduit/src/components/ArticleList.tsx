import { Link } from '@adwd/inertia-preact'
import { articleUrl, avatar, formatDate, profileUrl } from '../format.ts'
import type { ArticlePreview as Preview, Paginated } from '../types.ts'
import { FavoriteButton } from './actions.tsx'
import TagList from './TagList.tsx'

function ArticlePreview({ article }: { article: Preview }) {
  return (
    <div class="article-preview">
      <div class="article-meta">
        <Link href={profileUrl(article.author.username)}>
          <img src={avatar(article.author.image)} alt="" />
        </Link>
        <div class="info">
          <Link href={profileUrl(article.author.username)} class="author">
            {article.author.username}
          </Link>
          <span class="date">{formatDate(article.createdAt)}</span>
        </div>
        <FavoriteButton article={article} compact />
      </div>
      {/* Prefetched on hover, so the article usually shows up instantly */}
      <Link href={articleUrl(article.slug)} class="preview-link" prefetch>
        <h1>{article.title}</h1>
        <p>{article.description}</p>
        <span>Read more...</span>
        <TagList tags={article.tagList} />
      </Link>
    </div>
  )
}

function Pagination({ currentPage, lastPage, url }: { currentPage: number; lastPage: number; url: string }) {
  if (lastPage <= 1) {
    return null
  }

  function pageUrl(page: number) {
    const [path, query = ''] = url.split('?')
    const params = new URLSearchParams(query)
    params.set('page', String(page))
    return `${path}?${params}`
  }

  return (
    <nav>
      <ul class="pagination">
        {Array.from({ length: lastPage }, (_, index) => index + 1).map((page) => (
          <li key={page} class={page === currentPage ? 'page-item active' : 'page-item'}>
            {/* Reloads the articles only */}
            <Link class="page-link" href={pageUrl(page)} only={['articles']} preserveState>
              {page}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default function ArticleList({ articles, url }: { articles: Paginated<Preview>; url: string }) {
  if (articles.data.length === 0) {
    return <div class="article-preview empty-feed-message">No articles are here... yet.</div>
  }

  return (
    <>
      {articles.data.map((article) => (
        <ArticlePreview key={article.slug} article={article} />
      ))}
      <Pagination currentPage={articles.currentPage} lastPage={articles.lastPage} url={url} />
    </>
  )
}
