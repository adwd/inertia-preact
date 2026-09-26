import { Link } from '@adwd/inertia-preact'
export default ({
  foo = 0,
  bar,
  baz,
  headers,
}: {
  foo?: number
  bar: number
  baz: number
  headers: Record<string, string>
}) => {
  window._inertia_props = { foo, bar, baz, headers }

  return (
    <div>
      <span class="text">This is the links page that demonstrates partial reloads</span>
      <span class="foo-text">Foo is now {foo}</span>
      <span class="bar-text">Bar is now {bar}</span>
      <span class="baz-text">Baz is now {baz}</span>
      <pre class="headers">{JSON.stringify(headers, null, 2)}</pre>

      <Link href="/links/partial-reloads" data={{ foo }} class="all">
        Update All
      </Link>
      <Link href="/links/partial-reloads" only={['headers', 'foo', 'bar']} data={{ foo }} class="foo-bar">
        Only foo + bar
      </Link>
      <Link href="/links/partial-reloads" only={['headers', 'baz']} data={{ foo }} class="baz">
        Only baz
      </Link>
      <Link href="/links/partial-reloads" except={['foo', 'bar']} data={{ foo }} class="except-foo-bar">
        Except foo + bar
      </Link>
      <Link href="/links/partial-reloads" except={['baz']} data={{ foo }} class="except-baz">
        Except baz
      </Link>
    </div>
  )
}
