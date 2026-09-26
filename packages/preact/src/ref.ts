import type { Ref } from 'preact'

/**
 * Points the `ref` given to a class component at its instance, on Preact 11.
 *
 * Preact 10 points a `ref` on a class component at the instance itself, and doesn't pass it as a prop.
 * Preact 11 passes `ref` to every component as a regular prop instead, leaving it to the component to
 * decide what it refers to. This does that for the components that expose their instance, so their `ref`
 * works the same with both versions. On Preact 10 there is never a `ref` prop, and this does nothing.
 */
export class InstanceRef<T> {
  private ref: Ref<T> | undefined
  private detach: (() => void) | null = null

  constructor(private readonly instance: T) {}

  update(ref: Ref<T> | undefined): void {
    if (ref === this.ref) {
      return
    }

    this.clear()
    this.ref = ref

    if (typeof ref === 'function') {
      // Callback refs may return a cleanup function (Preact 11), which replaces calling them with null
      const cleanup = ref(this.instance)
      this.detach = () => (typeof cleanup === 'function' ? cleanup() : ref(null))
    } else if (ref) {
      ref.current = this.instance
      this.detach = () => (ref.current = null)
    }
  }

  clear(): void {
    this.detach?.()
    this.detach = null
    this.ref = undefined
  }
}

/** The `ref` prop, which only exists on Preact 11 (see `InstanceRef`). */
export function refProp<T>(props: object): Ref<T> | undefined {
  return (props as { ref?: Ref<T> }).ref
}
