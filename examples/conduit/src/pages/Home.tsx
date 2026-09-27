import { Deferred, Head, Link, usePage } from '@adwd/inertia-preact'
import type { ComponentChildren } from 'preact'
import ArticleList from '../components/ArticleList.tsx'
import { tagUrl } from '../format.ts'
import type { ArticlePreview, FeedTab, Paginated } from '../types.ts'

interface Props {
  tab: FeedTab
  articles: Paginated<ArticlePreview>
  /** Deferred: loaded after the page is shown */
  tags?: string[]
}

// Switching feeds reloads the tab and the articles only: the popular tags stay
const feedReload = { only: ['tab', 'articles'], preserveState: true }

function FeedTabLink({ href, active, children }: { href: string; active: boolean; children: ComponentChildren }) {
  return (
    <li class="nav-item">
      <Link class={active ? 'nav-link active' : 'nav-link'} href={href} {...feedReload}>
        {children}
      </Link>
    </li>
  )
}

export default function Home({ tab, articles, tags }: Props) {
  const { url, props } = usePage()

  return (
    <div class="home-page">
      <Head title={tab.type === 'tag' ? `#${tab.tag}` : ''} />

      {!props.auth.user && (
        <div class="banner">
          <div class="container">
            <h1 class="logo-font">conduit</h1>
            <p>A place to share your knowledge.</p>
          </div>
        </div>
      )}

      <div class="container page">
        <div class="row">
          <div class="col-md-9">
            <div class="feed-toggle">
              <ul class="nav nav-pills outline-active">
                {props.auth.user && (
                  <FeedTabLink href="/?feed=following" active={tab.type === 'following'}>
                    Your Feed
                  </FeedTabLink>
                )}
                <FeedTabLink href="/" active={tab.type === 'global'}>
                  Global Feed
                </FeedTabLink>
                {tab.type === 'tag' && (
                  <FeedTabLink href={tagUrl(tab.tag)} active>
                    <i class="ion-pound" /> {tab.tag}
                  </FeedTabLink>
                )}
              </ul>
            </div>

            <ArticleList articles={articles} url={url} />
          </div>

          <div class="col-md-3">
            <div class="sidebar">
              <p>Popular Tags</p>

              <Deferred data="tags" fallback={<div>Loading tags...</div>}>
                <div class="tag-list">
                  {tags?.map((tag) => (
                    <Link key={tag} href={tagUrl(tag)} class="tag-pill tag-default" {...feedReload}>
                      {tag}
                    </Link>
                  ))}
                </div>
              </Deferred>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
