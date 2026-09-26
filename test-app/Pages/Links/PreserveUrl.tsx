import { Link, router } from '@adwd/inertia-preact'

interface PreserveUrlProps {
  foo?: string
  items?: {
    data: string[]
    next_page_url?: string
  }
}

const PreserveUrl = ({ foo = 'default', items }: PreserveUrlProps) => {
  const loadMore = () => {
    if (items?.next_page_url) {
      router.visit(items.next_page_url, {
        only: ['items'],
        preserveState: true,
        preserveScroll: true,
        preserveUrl: true,
      })
    }
  }

  return (
    <div>
      <span class="text">This is the links page that demonstrates preserve url on Links</span>
      <span class="foo">Foo is now {foo}</span>

      <Link href="/links/preserve-url-page-two" preserveUrl data={{ foo: 'bar' }} class="preserve">
        [URL] Preserve: true
      </Link>
      <Link href="/links/preserve-url-page-two" preserveUrl={false} data={{ foo: 'baz' }} class="preserve-false">
        [URL] Preserve: false
      </Link>

      {items && (
        <div class="items-section">
          <div class="items">
            {items.data.map((item) => (
              <div key={item} class="item">
                {item}
              </div>
            ))}
          </div>

          <span class="items-loaded">Items loaded: {items.data.length}</span>
          <span class="has-next-page">{items.next_page_url ? 'true' : 'false'}</span>

          {items.next_page_url && (
            <Link
              href={items.next_page_url}
              only={['items']}
              preserveState
              preserveScroll
              preserveUrl
              class="load-more"
            >
              Load More
            </Link>
          )}

          {items.next_page_url && (
            <button onClick={loadMore} class="load-more-router">
              Load More Router
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default PreserveUrl
