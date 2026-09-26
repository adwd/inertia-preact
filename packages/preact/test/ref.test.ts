import { describe, expect, test, vi } from 'vitest'
import { InstanceRef } from '../src/ref'

describe('InstanceRef (the ref prop of Preact 11)', () => {
  const instance = { name: 'instance' }

  test('points an object ref at the instance, and clears it', () => {
    const ref = { current: null as typeof instance | null }
    const instanceRef = new InstanceRef(instance)

    instanceRef.update(ref)
    expect(ref.current).toBe(instance)

    instanceRef.clear()
    expect(ref.current).toBeNull()
  })

  test('calls a callback ref with the instance, then with null or its cleanup function', () => {
    const callback = vi.fn()
    const cleanup = vi.fn()
    const withCleanup = vi.fn(() => cleanup)
    const instanceRef = new InstanceRef(instance)

    instanceRef.update(callback)
    instanceRef.update(withCleanup)
    expect(callback.mock.calls).toEqual([[instance], [null]])
    expect(withCleanup).toHaveBeenCalledWith(instance)

    instanceRef.clear()
    expect(cleanup).toHaveBeenCalledOnce()
    expect(withCleanup).toHaveBeenCalledOnce()
  })

  test('does nothing when the ref stays the same or there is none (Preact 10)', () => {
    const callback = vi.fn()
    const instanceRef = new InstanceRef(instance)

    instanceRef.update(callback)
    instanceRef.update(callback)
    expect(callback).toHaveBeenCalledOnce()

    instanceRef.update(undefined)
    instanceRef.clear()
    expect(callback.mock.calls).toEqual([[instance], [null]])
  })
})
