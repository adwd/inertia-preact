import {
  type Errors,
  type FormDataConvertible,
  type FormDataKeys,
  type FormDataType,
  hasFiles,
  http,
  HttpCancelledError,
  HttpResponseError,
  mergeDataIntoQueryString,
  type Method,
  objectToFormData,
  type UrlMethodPair,
  type UseFormArguments,
  UseFormUtils,
  type UseFormWithPrecognitionArguments,
  type UseHttpSubmitArguments,
  type UseHttpSubmitOptions,
} from '@inertiajs/core'
import { cloneDeep } from 'es-toolkit'
import { toSimpleValidationErrors } from 'laravel-precognition'
import { FormStore, type FormState, type FormValidation } from './formStore'
import { useStore } from './useStore'

export interface UseHttp<TForm extends object, TResponse = unknown> extends FormState<TForm> {
  /** The parsed JSON body of the last successful response. */
  response: TResponse | null
  /**
   * Sends the data as JSON (or as `FormData` when it contains files), or in the query string for GET.
   * Resolves with the response. Validation errors (422) are put in `errors` and resolve with `undefined`.
   */
  submit: (...args: UseHttpSubmitArguments<TResponse, TForm>) => Promise<TResponse>
  get: (url: string, options?: UseHttpSubmitOptions<TResponse, TForm>) => Promise<TResponse>
  post: (url: string, options?: UseHttpSubmitOptions<TResponse, TForm>) => Promise<TResponse>
  put: (url: string, options?: UseHttpSubmitOptions<TResponse, TForm>) => Promise<TResponse>
  patch: (url: string, options?: UseHttpSubmitOptions<TResponse, TForm>) => Promise<TResponse>
  delete: (url: string, options?: UseHttpSubmitOptions<TResponse, TForm>) => Promise<TResponse>
  /** Aborts the request in progress. */
  cancel: () => void
  dontRemember: <K extends FormDataKeys<TForm>>(...fields: K[]) => this
  /** Updates the data optimistically on the next submit, rolled back if it fails. */
  optimistic: (callback: (data: TForm) => Partial<TForm>) => this
  /** Keeps every validation error of a field, rather than only the first. */
  withAllErrors: () => this
  withPrecognition: (...args: UseFormWithPrecognitionArguments) => UseHttpPrecognitive<TForm, TResponse>
}

export type UseHttpPrecognitive<TForm extends object, TResponse = unknown> = UseHttp<TForm, TResponse> &
  FormValidation<TForm, UseHttpPrecognitive<TForm, TResponse>>

type Snapshot<TForm extends object, TResponse> = UseHttpPrecognitive<TForm, TResponse>

/** The form store behind `useHttp()`: submits with plain HTTP requests through the Inertia HTTP client. */
export class HttpFormStore<TForm extends object, TResponse> extends FormStore<TForm, Snapshot<TForm, TResponse>> {
  response: TResponse | null = null

  private abortController: AbortController | null = null
  private pendingOptimistic: ((data: TForm) => Partial<TForm>) | null = null

  protected override createSnapshot(): Snapshot<TForm, TResponse> {
    return {
      ...super.createSnapshot(),
      response: this.response,
      submit: this.submit,
      get: this.get,
      post: this.post,
      put: this.put,
      patch: this.patch,
      delete: this.delete,
      cancel: this.cancel,
      dontRemember: this.dontRemember,
      optimistic: this.optimistic,
    }
  }

  submit = (...args: UseHttpSubmitArguments<TResponse, TForm>): Promise<TResponse> => {
    const { method, url, options } = UseFormUtils.parseSubmitArguments(args as never, this.precognitionEndpoint)

    return this.request(method, url, options as UseHttpSubmitOptions<TResponse, TForm>)
  }

  get = (url: string, options: UseHttpSubmitOptions<TResponse, TForm> = {}) => this.request('get', url, options)
  post = (url: string, options: UseHttpSubmitOptions<TResponse, TForm> = {}) => this.request('post', url, options)
  put = (url: string, options: UseHttpSubmitOptions<TResponse, TForm> = {}) => this.request('put', url, options)
  patch = (url: string, options: UseHttpSubmitOptions<TResponse, TForm> = {}) => this.request('patch', url, options)
  delete = (url: string, options: UseHttpSubmitOptions<TResponse, TForm> = {}) => this.request('delete', url, options)

  cancel = (): void => {
    this.abortController?.abort()
  }

  dontRemember = (...fields: string[]): Snapshot<TForm, TResponse> => {
    this.excludeFromRemembering(fields)

    return this.getSnapshot()
  }

  optimistic = (callback: (data: TForm) => Partial<TForm>): Snapshot<TForm, TResponse> => {
    this.pendingOptimistic = callback

    return this.getSnapshot()
  }

  private async request(
    method: Method,
    url: string,
    options: UseHttpSubmitOptions<TResponse, TForm>,
  ): Promise<TResponse> {
    if (options.onBefore?.() === false) {
      throw new Error('Request cancelled by onBefore')
    }

    this.beforeSubmit()

    const abortController = new AbortController()
    this.abortController = abortController
    options.onCancelToken?.({ cancel: () => abortController.abort() })

    const optimistic = options.optimistic ?? this.pendingOptimistic
    this.pendingOptimistic = null

    // Kept to roll back the optimistic update when the request fails
    let snapshot: TForm | undefined

    if (optimistic) {
      snapshot = cloneDeep(this.data)
      this.update({ data: { ...this.data, ...optimistic(cloneDeep(snapshot)) } })
    }

    this.update({ processing: true })
    options.onStart?.()

    const data = this.transformedData() as Record<string, FormDataConvertible>
    let body: FormData | string | undefined
    let contentType: string | undefined

    if (method === 'get') {
      url = mergeDataIntoQueryString(method, url, data)[0]
    } else if (hasFiles(data)) {
      body = objectToFormData(data)
    } else {
      body = JSON.stringify(data)
      contentType = 'application/json'
    }

    try {
      const response = await http.getClient().request({
        method,
        url,
        data: body,
        headers: {
          Accept: 'application/json',
          ...(contentType ? { 'Content-Type': contentType } : {}),
          ...options.headers,
        },
        signal: abortController.signal,
        onUploadProgress: (event) => {
          this.update({ progress: event })
          options.onProgress?.(event)
        },
      })

      if (response.status < 200 || response.status >= 300) {
        throw new HttpResponseError(`Request failed with status ${response.status}`, response)
      }

      const responseData = (response.data ? JSON.parse(response.data) : null) as TResponse

      this.markAsSuccessful()
      this.response = responseData
      this.changed()

      options.onSuccess?.(responseData, response)
      this.updateDefaultsAfterSuccess()

      return responseData
    } catch (error) {
      if (snapshot) {
        this.update({ data: snapshot })
      }

      if (error instanceof HttpResponseError) {
        if (error.response.status === 422) {
          const errors = (JSON.parse(error.response.data).errors ?? {}) as Errors
          const processedErrors = (this.allErrorsEnabled() ? errors : toSimpleValidationErrors(errors)) as Errors

          this.replaceErrors(processedErrors)
          options.onError?.(processedErrors)

          return undefined as TResponse
        }

        options.onHttpException?.(error.response)

        throw error
      }

      if (error instanceof HttpCancelledError || (error instanceof Error && error.name === 'AbortError')) {
        options.onCancel?.()

        throw new HttpCancelledError('Request was cancelled', url)
      }

      options.onNetworkError?.(error instanceof Error ? error : new Error('Unknown error'))

      throw error
    } finally {
      this.finishSubmit()

      if (this.abortController === abortController) {
        this.abortController = null
      }

      options.onFinish?.()
    }
  }
}

/**
 * Like `useForm()`, but sends plain HTTP requests (e.g. to a JSON API) instead of Inertia visits, and keeps
 * the response. Takes the same arguments as `useForm()`.
 */
export default function useHttp<TForm extends FormDataType<TForm>, TResponse = unknown>(
  method: Method | (() => Method),
  url: string | (() => string),
  data: TForm | (() => TForm),
): UseHttpPrecognitive<TForm, TResponse>
export default function useHttp<TForm extends FormDataType<TForm>, TResponse = unknown>(
  urlMethodPair: UrlMethodPair | (() => UrlMethodPair),
  data: TForm | (() => TForm),
): UseHttpPrecognitive<TForm, TResponse>
export default function useHttp<TForm extends FormDataType<TForm>, TResponse = unknown>(
  rememberKey: string,
  data: TForm | (() => TForm),
): UseHttp<TForm, TResponse>
export default function useHttp<TForm extends FormDataType<TForm>, TResponse = unknown>(
  data: TForm | (() => TForm),
): UseHttp<TForm, TResponse>
export default function useHttp<TForm extends FormDataType<TForm>, TResponse = unknown>(): UseHttp<TForm, TResponse>
export default function useHttp<TForm extends FormDataType<TForm>, TResponse = unknown>(
  ...args: UseFormArguments<TForm>
): UseHttp<TForm, TResponse> | UseHttpPrecognitive<TForm, TResponse> {
  return useStore(() => new HttpFormStore<TForm, TResponse>(UseFormUtils.parseUseFormArguments<TForm>(...args)))
}
