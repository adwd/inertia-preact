import {
  getScrollableParent,
  type InfiniteScrollActionSlotProps,
  type InfiniteScrollComponentBaseProps,
  type InfiniteScrollRef,
  type InfiniteScrollSlotProps,
  type Page,
  type ReloadOptions,
  useInfiniteScroll,
  type UseInfiniteScrollProps,
} from '@inertiajs/core'
import {
  Component,
  type ComponentChildren,
  createRef,
  Fragment,
  h,
  type HTMLAttributes,
  type RefObject,
  type VNode,
} from 'preact'
import { PageContext } from './context'
import { InstanceRef, refProp } from './ref'

/** A CSS selector or a ref to an element. */
type ElementOption = string | RefObject<HTMLElement>

type Slot<TProps> = ComponentChildren | ((props: TProps) => ComponentChildren)

export type InfiniteScrollProps = InfiniteScrollComponentBaseProps &
  Omit<HTMLAttributes<HTMLElement>, keyof InfiniteScrollComponentBaseProps | 'children' | 'ref'> & {
    /** The items, or a function that receives the loading state. */
    children?: Slot<InfiniteScrollSlotProps>
    /** Replaces the element that loads the previous page when it comes into view. */
    startElement?: ElementOption
    /** Replaces the element that loads the next page when it comes into view. */
    endElement?: ElementOption
    /** The element containing the items, when it isn't the element this component renders. */
    itemsElement?: ElementOption
    /** Rendered before the items, e.g. a "Load previous" button in manual mode. */
    previous?: Slot<InfiniteScrollActionSlotProps>
    /** Rendered after the items, e.g. a "Load more" button in manual mode. */
    next?: Slot<InfiniteScrollActionSlotProps>
    /** Rendered while loading, in place of `previous` / `next` when those aren't given. */
    loading?: Slot<InfiniteScrollActionSlotProps>
    /** Options for the requests that load pages. */
    params?: ReloadOptions
  }

interface InfiniteScrollState {
  loadingPrevious: boolean
  loadingNext: boolean
  requestCount: number
  hasPrevious: boolean
  hasNext: boolean
}

interface ResolvedElements {
  start: HTMLElement | null
  end: HTMLElement | null
  items: HTMLElement | null
}

function resolveElement(option: ElementOption | undefined, fallback: RefObject<HTMLElement>): HTMLElement | null {
  if (typeof option === 'string') {
    return document.querySelector<HTMLElement>(option)
  }

  return (option ?? fallback).current
}

function renderSlot<TProps>(slot: Slot<TProps>, props: TProps): ComponentChildren {
  return typeof slot === 'function' ? slot(props) : slot
}

/**
 * Loads the next (and previous) pages of a scroll prop as the user scrolls, merging them into the page
 * props. Trigger elements are rendered before and after the items, unless custom ones are given.
 *
 * The component instance, available through a `ref`, can load pages programmatically (`fetchNext()`,
 * `fetchPrevious()`) and tells whether there are more (`hasNext()`, `hasPrevious()`).
 */
export default class InfiniteScroll
  extends Component<InfiniteScrollProps, InfiniteScrollState>
  implements InfiniteScrollRef
{
  static override displayName = 'InertiaInfiniteScroll'
  static override contextType = PageContext

  private readonly startTrigger = createRef<HTMLElement>()
  private readonly endTrigger = createRef<HTMLElement>()
  private readonly items = createRef<HTMLElement>()
  private instance: UseInfiniteScrollProps | null = null
  private elements: ResolvedElements = { start: null, end: null, items: null }
  private readonly instanceRef = new InstanceRef<this>(this)

  constructor(props: InfiniteScrollProps, page: Page | null) {
    super(props)

    // The page tells the initial state, until the infinite scroll is set up on mount (only in the browser)
    const scrollProp = page?.scrollProps?.[props.data]

    this.state = {
      loadingPrevious: false,
      loadingNext: false,
      requestCount: 0,
      hasPrevious: !!scrollProp?.previousPage,
      hasNext: !!scrollProp?.nextPage,
    }
  }

  override componentDidMount(): void {
    this.instanceRef.update(refProp(this.props))
    this.setUp()
  }

  override componentDidUpdate(previousProps: InfiniteScrollProps, previousState: InfiniteScrollState): void {
    this.instanceRef.update(refProp(this.props))

    const elements = this.resolveElements()

    if (
      previousProps.data !== this.props.data ||
      elements.start !== this.elements.start ||
      elements.end !== this.elements.end ||
      elements.items !== this.elements.items
    ) {
      this.tearDown()
      this.setUp()
      return
    }

    if (
      this.autoLoads(previousProps, previousState) !== this.autoLoads() ||
      previousProps.onlyNext !== this.props.onlyNext ||
      previousProps.onlyPrevious !== this.props.onlyPrevious
    ) {
      this.toggleTriggers()
    }
  }

  override componentWillUnmount(): void {
    this.instanceRef.clear()
    this.tearDown()
  }

  fetchNext = (reloadOptions?: ReloadOptions): void => this.instance?.dataManager.fetchNext(reloadOptions)

  fetchPrevious = (reloadOptions?: ReloadOptions): void => this.instance?.dataManager.fetchPrevious(reloadOptions)

  hasNext = (): boolean => this.instance?.dataManager.hasNext() ?? false

  hasPrevious = (): boolean => this.instance?.dataManager.hasPrevious() ?? false

  override render() {
    const {
      data: _data,
      buffer: _buffer,
      as = 'div',
      manual: _manual,
      manualAfter: _manualAfter,
      preserveUrl: _preserveUrl,
      reverse = false,
      autoScroll: _autoScroll,
      onlyNext = false,
      onlyPrevious = false,
      startElement,
      endElement,
      itemsElement: _itemsElement,
      previous,
      next,
      loading,
      params: _params,
      children,
      // Preact 11 passes `ref` as a prop, it refers to this component (see componentDidMount())
      ref: _ref,
      ...attributes
    } = this.props as InfiniteScrollProps & { ref?: unknown }

    const { loadingPrevious, loadingNext, hasPrevious, hasNext } = this.state
    const autoLoad = this.autoLoads()
    const shared = { loadingPrevious, loadingNext, hasPrevious, hasNext }
    const elements: VNode<any>[] = []

    if (!startElement) {
      const autoMode = autoLoad && !onlyNext
      const slotProps: InfiniteScrollActionSlotProps = {
        ...shared,
        loading: loadingPrevious,
        fetch: this.fetchPrevious,
        autoMode,
        manualMode: !autoMode,
        hasMore: hasPrevious,
      }

      elements.push(
        h(
          'div',
          { key: 'start', ref: this.startTrigger },
          previous ? renderSlot(previous, slotProps) : loadingPrevious ? renderSlot(loading, slotProps) : null,
        ),
      )
    }

    elements.push(
      h(
        as,
        { ...attributes, key: 'items', ref: this.items },
        renderSlot(children, { loading: loadingPrevious || loadingNext, loadingPrevious, loadingNext }),
      ),
    )

    if (!endElement) {
      const autoMode = autoLoad && !onlyPrevious
      const slotProps: InfiniteScrollActionSlotProps = {
        ...shared,
        loading: loadingNext,
        fetch: this.fetchNext,
        autoMode,
        manualMode: !autoMode,
        hasMore: hasNext,
      }

      elements.push(
        h(
          'div',
          { key: 'end', ref: this.endTrigger },
          next ? renderSlot(next, slotProps) : loadingNext ? renderSlot(loading, slotProps) : null,
        ),
      )
    }

    return h(Fragment, null, reverse ? elements.reverse() : elements)
  }

  private autoLoads(props = this.props, state = this.state): boolean {
    const { manual = false, manualAfter = 0 } = props

    return !(manual || (manualAfter > 0 && state.requestCount >= manualAfter))
  }

  private resolveElements(): ResolvedElements {
    return {
      start: resolveElement(this.props.startElement, this.startTrigger),
      end: resolveElement(this.props.endElement, this.endTrigger),
      items: resolveElement(this.props.itemsElement, this.items),
    }
  }

  private setUp(): void {
    this.elements = this.resolveElements()

    const { start, end, items } = this.elements

    if (!items) {
      // A custom items element that isn't rendered (yet), see componentDidUpdate()
      return
    }

    const scrollableParent = getScrollableParent(items)

    const instance = useInfiniteScroll({
      getPropName: () => this.props.data,
      inReverseMode: () => this.props.reverse ?? false,
      shouldFetchNext: () => !this.props.onlyPrevious,
      shouldFetchPrevious: () => !this.props.onlyNext,
      shouldPreserveUrl: () => this.props.preserveUrl ?? false,
      getReloadOptions: () => this.props.params ?? {},

      getTriggerMargin: () => this.props.buffer ?? 0,
      getStartElement: () => start!,
      getEndElement: () => end!,
      getItemsElement: () => items,
      getScrollableParent: () => scrollableParent,

      onBeforePreviousRequest: () => this.setState({ loadingPrevious: true }),
      onBeforeNextRequest: () => this.setState({ loadingNext: true }),
      onCompletePreviousRequest: ({ completed }) => {
        this.setState({ loadingPrevious: false })

        if (completed) {
          this.syncState()
        }
      },
      onCompleteNextRequest: ({ completed }) => {
        this.setState({ loadingNext: false })

        if (completed) {
          this.syncState()
        }
      },
      onDataReset: () => this.syncState(),
    })

    this.instance = instance
    this.syncState()

    instance.elementManager.setupObservers()
    instance.elementManager.processServerLoadedElements(instance.dataManager.getLastLoadedPage())

    if (this.props.autoScroll ?? this.props.reverse) {
      // Start at the bottom, e.g. for a chat
      if (scrollableParent) {
        scrollableParent.scrollTo({ top: scrollableParent.scrollHeight, behavior: 'instant' })
      } else {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })
      }
    }

    // The request count may have been restored from the history, and isn't in the state yet
    this.toggleTriggers(instance.dataManager.getRequestCount())
  }

  private tearDown(): void {
    this.instance?.flush()
    this.instance = null
  }

  private syncState(): void {
    const dataManager = this.instance?.dataManager

    if (dataManager) {
      this.setState({
        requestCount: dataManager.getRequestCount(),
        hasPrevious: dataManager.hasPrevious(),
        hasNext: dataManager.hasNext(),
      })
    }
  }

  // Loads pages as their trigger comes into view, unless in manual mode
  private toggleTriggers(requestCount = this.state.requestCount): void {
    if (this.autoLoads(this.props, { ...this.state, requestCount })) {
      this.instance?.elementManager.enableTriggers()
    } else {
      this.instance?.elementManager.disableTriggers()
    }
  }
}
