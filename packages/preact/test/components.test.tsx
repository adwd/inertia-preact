// @vitest-environment happy-dom
import { createRef, hydrate, render } from 'preact'
import { renderToString } from 'preact-render-to-string'
import { act } from 'preact/test-utils'
import { afterEach, describe, expect, test } from 'vitest'
import { Form, type InertiaForm, Link, useForm, useFormContext, WhenMounted } from '../src'
import { AppContext, type AppState } from '../src/context'

let container: HTMLElement

function mount(vnode: preact.ComponentChildren) {
  container = document.createElement('div')
  document.body.appendChild(container)

  act(() => render(vnode, container))

  return container
}

afterEach(() => {
  act(() => render(null, container))
  container.remove()
})

const flush = () => act(async () => await Promise.resolve())

describe('<Form>', () => {
  test('exposes its state and methods on the instance, through a ref', () => {
    const form = createRef<Form>()

    mount(
      <Form ref={form} action="/users" method="post">
        <input name="name" defaultValue="Jane" />
        <input name="tags[]" defaultValue="a" />
      </Form>,
    )

    expect(form.current!.getData()).toEqual({ name: 'Jane', tags: ['a'] })
    expect(form.current!).toMatchObject({ isDirty: false, processing: false, hasErrors: false })
  })

  test('tracks whether the fields differ from their defaults, and resets them', () => {
    const form = createRef<Form>()
    mount(
      <Form ref={form}>
        <input name="name" defaultValue="Jane" />
      </Form>,
    )
    const input = container.querySelector('input')!

    act(() => {
      input.value = 'John'
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(form.current!.isDirty).toBe(true)

    act(() => form.current!.reset())
    expect(input.value).toBe('Jane')
    expect(form.current!.isDirty).toBe(false)
  })

  test('passes the form to a children function and to useFormContext()', async () => {
    const Errors = () => <p id="context">{useFormContext()?.errors.name}</p>
    const form = createRef<Form>()

    mount(
      <Form ref={form}>
        {({ errors }) => (
          <>
            <p id="slot">{errors.name}</p>
            <Errors />
          </>
        )}
      </Form>,
    )

    form.current!.setError('name', 'Required')
    await flush()

    expect(container.querySelector('#slot')!.textContent).toBe('Required')
    expect(container.querySelector('#context')!.textContent).toBe('Required')
  })
})

describe('useForm()', () => {
  test('re-renders on changes and keeps returning the same object while nothing changes', async () => {
    const forms: Array<InertiaForm<{ name: string }>> = []

    const Component = () => {
      const form = useForm({ name: 'Jane' })
      forms.push(form)

      return <p>{form.data.name}</p>
    }

    mount(<Component />)
    act(() => render(<Component />, container))

    expect(forms[1]).toBe(forms[0])

    forms[0].setData('name', 'John')
    await flush()

    expect(container.textContent).toBe('John')
    expect(forms.at(-1)).not.toBe(forms[0])
    expect(forms.at(-1)!.setData).toBe(forms[0].setData)
  })
})

describe('<WhenMounted>', () => {
  const app = (hydrated: boolean) => ({ hydrated }) as AppState

  const content = (
    <WhenMounted fallback={<p>Fallback</p>}>
      <p>Content</p>
    </WhenMounted>
  )

  test('renders the fallback on the server', () => {
    expect(renderToString(<AppContext.Provider value={app(false)}>{content}</AppContext.Provider>)).toBe(
      '<p>Fallback</p>',
    )
  })

  test('renders the children right away outside of hydration', () => {
    mount(<AppContext.Provider value={app(true)}>{content}</AppContext.Provider>)

    expect(container.innerHTML).toBe('<p>Content</p>')
  })

  test('hydrates the fallback, then renders the children', () => {
    let fallbackRenders = 0

    const Fallback = () => {
      fallbackRenders++
      return <p>Fallback</p>
    }

    container = document.createElement('div')
    container.innerHTML = '<p>Fallback</p>'
    document.body.appendChild(container)

    act(() =>
      hydrate(
        <AppContext.Provider value={app(false)}>
          <WhenMounted fallback={<Fallback />}>
            <p>Content</p>
          </WhenMounted>
        </AppContext.Provider>,
        container,
      ),
    )

    expect(fallbackRenders).toBe(1)
    expect(container.innerHTML).toBe('<p>Content</p>')
  })
})

describe('<Link>', () => {
  test('renders an anchor with the data merged into the URL for GET visits', () => {
    mount(
      <Link href="/users" data={{ page: 2 }} class="link">
        Users
      </Link>,
    )

    expect(container.innerHTML).toBe('<a class="link" href="/users?page=2">Users</a>')
  })

  test('renders a button for other methods', () => {
    mount(
      <Link href="/logout" method="post">
        Log out
      </Link>,
    )

    expect(container.innerHTML).toBe('<button type="button">Log out</button>')
  })

  test('renders the given element or component', () => {
    const Custom = (props: { href?: string; children?: preact.ComponentChildren }) => (
      <span data-href={props.href}>{props.children}</span>
    )

    mount(
      <>
        <Link as="div" href="/a">
          A
        </Link>
        <Link as={Custom} href="/b">
          B
        </Link>
      </>,
    )

    expect(container.innerHTML).toBe('<div>A</div><span data-href="/b">B</span>')
  })
})
