import { http, HttpCancelledError, type HttpRequestConfig, type HttpResponse } from '@inertiajs/core'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { HttpFormStore } from '../src/useHttp'

type Form = { name: string; avatar?: File | null }

const respond = (status: number, body: unknown = null): HttpResponse => ({
  status,
  data: body === null ? '' : JSON.stringify(body),
  headers: {},
})

function fakeClient(handler: (config: HttpRequestConfig) => HttpResponse | Promise<HttpResponse>) {
  const requests: HttpRequestConfig[] = []

  http.setClient({
    request: async (config) => {
      requests.push(config)
      return handler(config)
    },
  })

  return requests
}

const createStore = () => new HttpFormStore<Form, { id: number }>({ data: { name: 'Jane' } })

afterEach(() => vi.useRealTimers())

describe('useHttp store', () => {
  test('sends the data as JSON and keeps the parsed response', async () => {
    const requests = fakeClient(() => respond(201, { id: 1 }))
    const store = createStore()
    const onSuccess = vi.fn()

    const response = await store.post('/api/users', { headers: { 'X-Test': '1' }, onSuccess })

    expect(response).toEqual({ id: 1 })
    expect(requests[0]).toMatchObject({
      method: 'post',
      url: '/api/users',
      data: '{"name":"Jane"}',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Test': '1' },
    })
    expect(onSuccess).toHaveBeenCalledWith({ id: 1 }, expect.objectContaining({ status: 201 }))
    expect(store.getSnapshot()).toMatchObject({ response: { id: 1 }, wasSuccessful: true, processing: false })
  })

  test('puts the data in the query string for GET requests', async () => {
    const requests = fakeClient(() => respond(200, { id: 1 }))

    await createStore().get('/api/users?page=2')

    expect(requests[0]).toMatchObject({ url: '/api/users?page=2&name=Jane', data: undefined })
  })

  test('sends FormData when the data contains files', async () => {
    const requests = fakeClient(() => respond(200))
    const store = createStore()

    store.setData('avatar', new File(['x'], 'avatar.png'))
    await store.post('/api/avatar')

    expect(requests[0].data).toBeInstanceOf(FormData)
    expect(requests[0].headers).not.toHaveProperty('Content-Type')
  })

  test('puts validation errors in the errors and resolves with undefined', async () => {
    fakeClient(() => respond(422, { errors: { name: ['Taken', 'Too short'] } }))
    const store = createStore()
    const onError = vi.fn()

    await expect(store.post('/api/users', { onError })).resolves.toBeUndefined()

    expect(store.errors).toEqual({ name: 'Taken' })
    expect(onError).toHaveBeenCalledWith({ name: 'Taken' })
  })

  test('keeps every validation error with withAllErrors()', async () => {
    fakeClient(() => respond(422, { errors: { name: ['Taken', 'Too short'] } }))
    const store = createStore()

    store.withAllErrors()
    await store.post('/api/users')

    expect(store.errors).toEqual({ name: ['Taken', 'Too short'] })
  })

  test('rejects on other error responses and rolls back an optimistic update', async () => {
    fakeClient(() => respond(500))
    const store = createStore()
    const onHttpException = vi.fn()

    const request = store
      .getSnapshot()
      .optimistic(() => ({ name: 'Optimistic' }))
      .post('/api/users', { onHttpException })

    expect(store.data.name).toBe('Optimistic')
    await expect(request).rejects.toThrow('Request failed with status 500')
    expect(store.data.name).toBe('Jane')
    expect(onHttpException).toHaveBeenCalledWith(expect.objectContaining({ status: 500 }))
  })

  test('can be cancelled', async () => {
    fakeClient(
      ({ signal }) =>
        new Promise((_, reject) =>
          signal!.addEventListener('abort', () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }))),
        ),
    )
    const store = createStore()
    const onCancel = vi.fn()

    const request = store.post('/api/users', { onCancel })
    store.cancel()

    await expect(request).rejects.toBeInstanceOf(HttpCancelledError)
    expect(onCancel).toHaveBeenCalled()
    expect(store.processing).toBe(false)
  })

  test('does not send the request when onBefore returns false', async () => {
    const requests = fakeClient(() => respond(200))

    await expect(createStore().post('/api/users', { onBefore: () => false })).rejects.toThrow('cancelled by onBefore')
    expect(requests).toHaveLength(0)
  })
})
