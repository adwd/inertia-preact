import { describe, expect, test } from 'vitest'
import { renderHeadElements } from '../src/renderHead'

describe('renderHeadElements', () => {
  test('renders elements with their attributes and marks them as managed by Inertia', () => {
    expect(
      renderHeadElements(
        <>
          <meta name="description" content='An "escaped" description' />
          <link rel="canonical" href="https://example.com?a=1&b=2" />
        </>,
      ),
    ).toEqual([
      '<meta name="description" content="An &quot;escaped&quot; description" data-inertia>',
      '<link rel="canonical" href="https://example.com?a=1&amp;b=2" data-inertia>',
    ])
  })

  test('stringifies non-string attribute values for backwards compatibility', () => {
    const elements = renderHeadElements(
      <>
        {/* @ts-expect-error - content must be a string */}
        <meta name="number" content={0} />
        <meta name="undefined" content={undefined} />
        {/* @ts-expect-error - content must be a string */}
        <meta name="false" content={false} />
      </>,
    )

    expect(elements).toEqual([
      '<meta name="number" content="0" data-inertia>',
      '<meta name="undefined" content="undefined" data-inertia>',
      '<meta name="false" content="false" data-inertia>',
    ])
  })

  test('renders empty attributes without a value and skips event handlers', () => {
    expect(renderHeadElements(<link rel="preload" href="/font.woff2" title="" onLoad={() => {}} />)).toEqual([
      '<link rel="preload" href="/font.woff2" title data-inertia>',
    ])
  })

  test('uses the head-key as the data-inertia value', () => {
    expect(renderHeadElements(<meta head-key="description" name="description" content="Hi" />)).toEqual([
      '<meta name="description" content="Hi" data-inertia="description">',
    ])
  })

  test('escapes text content, except in script and style elements', () => {
    const name = '</title><script>alert(1)</script>'

    expect(
      renderHeadElements(
        <>
          <title>Hello {name}</title>
          <style>{'a > b { color: red }'}</style>
          <script type="application/ld+json">{'{"a":"<b>"}'}</script>
        </>,
      ),
    ).toEqual([
      '<title data-inertia>Hello &lt;/title&gt;&lt;script&gt;alert(1)&lt;/script&gt;</title>',
      '<style data-inertia>a > b { color: red }</style>',
      '<script type="application/ld+json" data-inertia>{"a":"<b>"}</script>',
    ])
  })

  test('renders dangerouslySetInnerHTML as is', () => {
    expect(renderHeadElements(<script dangerouslySetInnerHTML={{ __html: 'window.a = 1 < 2' }} />)).toEqual([
      '<script data-inertia>window.a = 1 < 2</script>',
    ])
  })

  test('maps DOM property names to attribute names', () => {
    expect(renderHeadElements(<meta httpEquiv="refresh" content="30" />)).toEqual([
      '<meta http-equiv="refresh" content="30" data-inertia>',
    ])
  })

  test('adds the escaped title prop unless there is a title element', () => {
    expect(renderHeadElements(null, 'Tom & <Jerry>')).toEqual([
      '<title data-inertia="">Tom &amp; &lt;Jerry&gt;</title>',
    ])
    expect(renderHeadElements(<title>Own title</title>, 'Prop title')).toEqual([
      '<title data-inertia>Own title</title>',
    ])
  })

  test('flattens fragments and arrays, and ignores text, empty values and components', () => {
    function Component() {
      return <meta name="ignored" />
    }
    const show = false

    expect(
      renderHeadElements([
        'text',
        null,
        show && <meta name="hidden" />,
        <>
          {[<meta key="a" name="a" />, <meta key="b" name="b" />]}
          <Component />
        </>,
      ]),
    ).toEqual(['<meta name="a" data-inertia>', '<meta name="b" data-inertia>'])
  })
})
