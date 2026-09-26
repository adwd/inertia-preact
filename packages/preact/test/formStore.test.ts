import { router, type VisitOptions } from '@inertiajs/core'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { InertiaFormStore } from '../src/useForm'

type UserForm = { name: string; address: { city: string }; tags: string[] }

const createStore = (data: UserForm | (() => UserForm) = { name: 'Jane', address: { city: 'Tokyo' }, tags: [] }) =>
  new InertiaFormStore<UserForm>({ data })

const tick = () => new Promise<void>((resolve) => queueMicrotask(resolve))

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('data', () => {
  test('sets a field, a nested field, several fields, or everything through a function', () => {
    const store = createStore()
    const { setData } = store.getSnapshot()

    setData('name', 'John')
    setData('address.city', 'Osaka')
    expect(store.data).toEqual({ name: 'John', address: { city: 'Osaka' }, tags: [] })

    setData({ tags: ['a'] })
    expect(store.data).toEqual({ name: 'John', address: { city: 'Osaka' }, tags: ['a'] })

    setData((data) => ({ ...data, name: data.name.toUpperCase() }))
    expect(store.data.name).toBe('JOHN')
  })

  test('never mutates the previous data', () => {
    const store = createStore()
    const before = store.data

    store.setData('address.city', 'Osaka')

    expect(before.address.city).toBe('Tokyo')
    expect(store.data).not.toBe(before)
  })

  test('is dirty when the data differs from the defaults', () => {
    const store = createStore()

    store.setData('name', 'John')
    expect(store.getSnapshot().isDirty).toBe(true)

    store.setData('name', 'Jane')
    expect(store.getSnapshot().isDirty).toBe(false)
  })

  test('sets the defaults to the current data, a field or several fields', () => {
    const store = createStore()

    store.setData('name', 'John')
    store.setDefaults()
    expect(store.getSnapshot().isDirty).toBe(false)

    store.setDefaults('address.city', 'Kyoto')
    expect(store.defaults.address.city).toBe('Kyoto')

    store.setDefaults({ tags: ['x'] })
    expect(store.defaults).toEqual({ name: 'John', address: { city: 'Kyoto' }, tags: ['x'] })
  })

  test('resets all data or the given fields to the defaults', () => {
    const store = createStore()

    store.setData({ name: 'John', address: { city: 'Osaka' } })
    store.reset('address.city')
    expect(store.data).toEqual({ name: 'John', address: { city: 'Tokyo' }, tags: [] })

    store.reset()
    expect(store.data).toEqual({ name: 'Jane', address: { city: 'Tokyo' }, tags: [] })
  })

  test('resets to fresh data from a data function, which also becomes the defaults', () => {
    let city = 'Tokyo'
    const store = createStore(() => ({ name: 'Jane', address: { city }, tags: [] }))

    city = 'Nagoya'
    store.reset()

    expect(store.data.address.city).toBe('Nagoya')
    expect(store.getSnapshot().isDirty).toBe(false)
    expect(() => store.setDefaults()).toThrow('You cannot call `setDefaults()`')
  })
})

describe('errors', () => {
  test('sets, merges and clears errors', () => {
    const store = createStore()

    store.setError('name', 'Required')
    store.setError({ 'address.city': 'Invalid' } as never)
    expect(store.getSnapshot()).toMatchObject({
      errors: { name: 'Required', 'address.city': 'Invalid' },
      hasErrors: true,
    })

    store.clearErrors('name')
    expect(store.errors).toEqual({ 'address.city': 'Invalid' })

    store.clearErrors()
    expect(store.getSnapshot().hasErrors).toBe(false)
  })

  test('resets and clears errors of the given fields', () => {
    const store = createStore()

    store.setData('name', 'John')
    store.setError({ name: 'Taken', tags: 'Invalid' } as never)
    store.resetAndClearErrors('name')

    expect(store.data.name).toBe('Jane')
    expect(store.errors).toEqual({ tags: 'Invalid' })
  })
})

describe('snapshots and subscriptions', () => {
  test('returns the same snapshot until something changes, with stable methods', () => {
    const store = createStore()
    const first = store.getSnapshot()

    expect(store.getSnapshot()).toBe(first)

    store.setData('name', 'John')
    const second = store.getSnapshot()

    expect(second).not.toBe(first)
    expect(second.setData).toBe(first.setData)
    expect(second.submit).toBe(first.submit)
  })

  test('notifies subscribers once per tick', async () => {
    const store = createStore()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)

    store.setData('name', 'John')
    store.setError('name', 'Taken')
    expect(listener).not.toHaveBeenCalled()

    await tick()
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    store.setData('name', 'Jane')
    await tick()
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe('submitting', () => {
  const captureVisit = () => {
    const visits: Array<{ url: string; data: unknown; options: VisitOptions }> = []

    for (const method of ['get', 'post', 'put', 'patch'] as const) {
      vi.spyOn(router, method).mockImplementation(((url: string, data: unknown, options: VisitOptions) => {
        visits.push({ url, data, options })
      }) as never)
    }

    vi.spyOn(router, 'delete').mockImplementation(((url: string, options: VisitOptions) => {
      visits.push({ url, data: options.data, options })
    }) as never)

    return visits
  }

  test('submits the transformed data with the given method', () => {
    const visits = captureVisit()
    const store = createStore()

    store.transform((data) => ({ ...data, name: data.name.toLowerCase() }))
    store.getSnapshot().post('/users', { preserveScroll: true })
    store.getSnapshot().delete('/users/1')

    expect(visits[0]).toMatchObject({ url: '/users', data: { name: 'jane' }, options: { preserveScroll: true } })
    expect(visits[1]).toMatchObject({ url: '/users/1', data: { name: 'jane' } })
  })

  test('tracks the submission and makes the submitted data the new defaults on success', async () => {
    vi.useFakeTimers()
    const visits = captureVisit()
    const onSuccess = vi.fn()
    const store = createStore()

    store.setData('name', 'John')
    store.submit('post', '/users', { onSuccess })

    const { options } = visits[0]
    options.onBefore!({} as never)
    options.onStart!({} as never)
    options.onProgress!({ percentage: 50 } as never)
    expect(store).toMatchObject({ processing: true, progress: { percentage: 50 } })

    await options.onSuccess!({} as never)
    options.onFinish!({} as never)

    expect(onSuccess).toHaveBeenCalled()
    expect(store.getSnapshot()).toMatchObject({
      processing: false,
      progress: null,
      wasSuccessful: true,
      recentlySuccessful: true,
      isDirty: false,
    })

    vi.advanceTimersByTime(2000)
    expect(store.recentlySuccessful).toBe(false)
  })

  test('keeps the defaults set in onSuccess', async () => {
    const visits = captureVisit()
    const store = createStore()

    store.setData('name', 'John')
    store.submit('post', '/users', { onSuccess: () => store.setDefaults('name', 'Custom') })
    await visits[0].options.onSuccess!({} as never)

    expect(store.defaults.name).toBe('Custom')
  })

  test('replaces the errors on a validation error', () => {
    const visits = captureVisit()
    const store = createStore()

    store.setError('tags', 'Old')
    store.post('/users')
    visits[0].options.onError!({ name: 'Taken' })

    expect(store.errors).toEqual({ name: 'Taken' })
  })

  test('cancels through the cancel token and passes a pending optimistic update', () => {
    const visits = captureVisit()
    const store = createStore()
    const cancel = vi.fn()
    const optimistic = () => ({})

    store.getSnapshot().optimistic(optimistic).post('/users')
    visits[0].options.onCancelToken!({ cancel })
    store.cancel()

    expect(visits[0].options.optimistic).toBe(optimistic)
    expect(cancel).toHaveBeenCalled()

    store.post('/users')
    expect(visits[1].options.optimistic).toBeUndefined()
  })
})
