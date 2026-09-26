import { escape } from 'es-toolkit/compat'
import { type ComponentChildren, Fragment, toChildArray, type VNode } from 'preact'

type ElementVNode = VNode<Record<string, unknown>> & { type: string }

const voidElements = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'keygen',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

// Elements whose text content the HTML serializer doesn't escape
const rawTextElements = new Set(['script', 'style'])

// DOM property names that Preact accepts as props, mapped to their attribute names
const attributeNames: Record<string, string> = {
  className: 'class',
  htmlFor: 'for',
  httpEquiv: 'http-equiv',
  acceptCharset: 'accept-charset',
}

const ignoredProps = new Set(['children', 'dangerouslySetInnerHTML', 'head-key'])

function isVNode(value: unknown): value is VNode<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && 'type' in value && 'props' in value
}

// Flattens fragments and drops anything that isn't an element, since only elements can go into <head>
function elementsOf(children: ComponentChildren): ElementVNode[] {
  return toChildArray(children).flatMap((child) => {
    if (!isVNode(child)) {
      return []
    }

    if (child.type === Fragment) {
      return elementsOf(child.props.children as ComponentChildren)
    }

    if (typeof child.type !== 'string') {
      if (import.meta.env?.DEV) {
        console.warn('[inertia-preact] <Head> only supports elements, components inside it are ignored.')
      }

      return []
    }

    return [child as ElementVNode]
  })
}

function renderAttributes(props: Record<string, unknown>): string {
  return Object.keys(props).reduce((html, name) => {
    const value = props[name]

    if (ignoredProps.has(name) || typeof value === 'function') {
      return html
    }

    const attribute = attributeNames[name] ?? name
    // Every other value is stringified, `undefined`, `null` and booleans included, for backwards compatibility
    const stringValue = String(value)

    return stringValue === '' ? `${html} ${attribute}` : `${html} ${attribute}="${escape(stringValue)}"`
  }, '')
}

function renderChildren(element: ElementVNode): string {
  const { children, dangerouslySetInnerHTML } = element.props as {
    children?: ComponentChildren
    dangerouslySetInnerHTML?: { __html: string }
  }

  if (dangerouslySetInnerHTML) {
    return dangerouslySetInnerHTML.__html
  }

  return toChildArray(children)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number' || typeof child === 'bigint') {
        return rawTextElements.has(element.type) ? String(child) : escape(String(child))
      }

      return elementsOf(child).map(renderElement).join('')
    })
    .join('')
}

function renderElement(element: ElementVNode): string {
  const headKey = element.props['head-key']
  const props = { ...element.props, 'data-inertia': headKey !== undefined ? headKey : '' }
  const start = `<${element.type}${renderAttributes(props)}>`

  return voidElements.has(element.type) ? start : `${start}${renderChildren(element)}</${element.type}>`
}

/**
 * Renders the children of `<Head>` to the HTML strings the head manager of `@inertiajs/core` works with.
 * Every element is marked with `data-inertia`, set to its `head-key` (if any) so it can be matched across pages.
 */
export function renderHeadElements(children: ComponentChildren, title?: string): string[] {
  const elements = elementsOf(children).map(renderElement)

  if (title && !elements.some((element) => element.startsWith('<title'))) {
    elements.push(`<title data-inertia="">${escape(title)}</title>`)
  }

  return elements
}
