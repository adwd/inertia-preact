import { router, usePage } from 'inertia-preact'
import { useEffect } from 'preact/hooks'

export default ({
  foo = 0,
  bar,
  baz,
  headers,
}: {
  foo: number
  bar: number
  baz: number
  headers: Record<string, string>
}) => {
  const page = usePage()

  useEffect(() => {
    window._inertia_props = page.props
  }, [page.props])

  const partialReloadVisit = (e: MouseEvent) => {
    e.preventDefault()
    router.visit('/visits/partial-reloads', { data: { foo: foo } })
  }

  const partialReloadVisitFooBar = (e: MouseEvent) => {
    e.preventDefault()
    router.visit('/visits/partial-reloads', { data: { foo: foo }, only: ['headers', 'foo', 'bar'] })
  }

  const partialReloadVisitBaz = (e: MouseEvent) => {
    e.preventDefault()
    router.visit('/visits/partial-reloads', { data: { foo: foo }, only: ['headers', 'baz'] })
  }

  const partialReloadVisitExceptFooBar = (e: MouseEvent) => {
    e.preventDefault()
    router.visit('/visits/partial-reloads', { data: { foo: foo }, except: ['foo', 'bar'] })
  }

  const partialReloadVisitExceptBaz = (e: MouseEvent) => {
    e.preventDefault()
    router.visit('/visits/partial-reloads', { data: { foo: foo }, except: ['baz'] })
  }

  const partialReloadGet = (e: MouseEvent) => {
    e.preventDefault()
    router.get('/visits/partial-reloads', { foo: foo })
  }

  const partialReloadGetFooBar = (e: MouseEvent) => {
    e.preventDefault()
    router.get('/visits/partial-reloads', { foo: foo }, { only: ['headers', 'foo', 'bar'] })
  }

  const partialReloadGetBaz = (e: MouseEvent) => {
    e.preventDefault()
    router.get('/visits/partial-reloads', { foo: foo }, { only: ['headers', 'baz'] })
  }

  const partialReloadGetExceptFooBar = (e: MouseEvent) => {
    e.preventDefault()
    router.get('/visits/partial-reloads', { foo: foo }, { except: ['foo', 'bar'] })
  }

  const partialReloadGetExceptBaz = (e: MouseEvent) => {
    e.preventDefault()
    router.get(
      '/visits/partial-reloads',
      { foo: foo },
      {
        except: ['baz'],
      },
    )
  }

  return (
    <div>
      <span class="text">This is the page that demonstrates partial reloads using manual visits</span>
      <span class="foo-text">Foo is now {foo}</span>
      <span class="bar-text">Bar is now {bar}</span>
      <span class="baz-text">Baz is now {baz}</span>
      <pre class="headers">{JSON.stringify(headers, null, 2)}</pre>

      <a href="#" onClick={partialReloadVisit} class="visit">
        Update All (visit)
      </a>
      <a href="#" onClick={partialReloadVisitFooBar} class="visit-foo-bar">
        'Only' foo + bar (visit)
      </a>
      <a href="#" onClick={partialReloadVisitBaz} class="visit-baz">
        'Only' baz (visit)
      </a>
      <a href="#" onClick={partialReloadVisitExceptFooBar} class="visit-except-foo-bar">
        'Except' foo + bar (visit)
      </a>
      <a href="#" onClick={partialReloadVisitExceptBaz} class="visit-except-baz">
        'Except' baz (visit)
      </a>

      <a href="#" onClick={partialReloadGet} class="get">
        Update All (GET)
      </a>
      <a href="#" onClick={partialReloadGetFooBar} class="get-foo-bar">
        'Only' foo + bar (GET)
      </a>
      <a href="#" onClick={partialReloadGetBaz} class="get-baz">
        'Only' baz (GET)
      </a>
      <a href="#" onClick={partialReloadGetExceptFooBar} class="get-except-foo-bar">
        'Except' foo + bar (GET)
      </a>
      <a href="#" onClick={partialReloadGetExceptBaz} class="get-except-baz">
        'Except' baz (GET)
      </a>
    </div>
  )
}
