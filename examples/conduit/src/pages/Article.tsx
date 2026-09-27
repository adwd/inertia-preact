import { Form, Head, Link, router, usePage } from '@adwd/inertia-preact'
import { FavoriteButton, FollowButton } from '../components/actions.tsx'
import ErrorMessages from '../components/ErrorMessages.tsx'
import TagList from '../components/TagList.tsx'
import { articleUrl, avatar, formatDate, profileUrl } from '../format.ts'
import type { Article as ArticleData, Comment } from '../types.ts'

interface Props {
  article: ArticleData
  comments: Comment[]
}

function ArticleMeta({ article }: { article: ArticleData }) {
  function remove() {
    if (confirm('Delete this article?')) {
      router.delete(articleUrl(article.slug))
    }
  }

  return (
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

      {article.can.edit && (
        <Link href={`/editor/${encodeURIComponent(article.slug)}`} class="btn btn-sm btn-outline-secondary">
          <i class="ion-edit" /> Edit Article
        </Link>
      )}
      {article.can.delete && (
        <>
          &nbsp;&nbsp;
          <button type="button" class="btn btn-sm btn-outline-danger" onClick={remove}>
            <i class="ion-trash-a" /> Delete Article
          </button>
        </>
      )}
      {!article.can.edit && (
        <>
          <FollowButton profile={article.author} />
          &nbsp;&nbsp;
          <FavoriteButton article={article} />
        </>
      )}
    </div>
  )
}

function Comments({ article, comments }: Props) {
  const user = usePage().props.auth.user
  const commentsUrl = `${articleUrl(article.slug)}/comments`

  function remove(comment: Comment) {
    router.delete(`${commentsUrl}/${comment.id}`, { preserveScroll: true, preserveState: true, only: ['comments'] })
  }

  return (
    <div class="row">
      <div class="col-xs-12 col-md-8 offset-md-2">
        {user ? (
          <>
            <ErrorMessages />
            {/* After posting, only the comments (and the errors) are reloaded */}
            <Form
              action={commentsUrl}
              method="post"
              class="card comment-form"
              options={{ preserveScroll: true, only: ['comments', 'errors'] }}
              resetOnSuccess
              disableWhileProcessing
            >
              <div class="card-block">
                <textarea class="form-control" name="body" placeholder="Write a comment..." rows={3} />
              </div>
              <div class="card-footer">
                <img src={avatar(user.image)} class="comment-author-img" alt="" />
                <button class="btn btn-sm btn-primary" type="submit">
                  Post Comment
                </button>
              </div>
            </Form>
          </>
        ) : (
          <p>
            <Link href="/login">Sign in</Link> or <Link href="/register">sign up</Link> to add comments on this article.
          </p>
        )}

        {comments.map((comment) => (
          <div key={comment.id} class="card">
            <div class="card-block">
              <p class="card-text">{comment.body}</p>
            </div>
            <div class="card-footer">
              <Link href={profileUrl(comment.author.username)} class="comment-author">
                <img src={avatar(comment.author.image)} class="comment-author-img" alt="" />
              </Link>
              &nbsp;
              <Link href={profileUrl(comment.author.username)} class="comment-author">
                {comment.author.username}
              </Link>
              <span class="date-posted">{formatDate(comment.createdAt)}</span>
              {comment.can.delete && (
                <span class="mod-options">
                  <i class="ion-trash-a" role="button" aria-label="Delete comment" onClick={() => remove(comment)} />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Article({ article, comments }: Props) {
  return (
    <div class="article-page">
      <Head title={article.title}>
        <meta name="description" content={article.description} />
      </Head>

      <div class="banner">
        <div class="container">
          <h1>{article.title}</h1>
          <ArticleMeta article={article} />
        </div>
      </div>

      <div class="container page">
        <div class="row article-content">
          <div class="col-md-12">
            {/* Rendered from Markdown and sanitized by the server */}
            <div dangerouslySetInnerHTML={{ __html: article.bodyHtml }} />
            <TagList tags={article.tagList} />
          </div>
        </div>

        <hr />

        <div class="article-actions">
          <ArticleMeta article={article} />
        </div>

        <Comments article={article} comments={comments} />
      </div>
    </div>
  )
}
