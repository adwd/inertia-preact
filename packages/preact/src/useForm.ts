import {
  type CancelToken,
  type FormDataKeys,
  type FormDataType,
  type Method,
  type OptimisticCallback,
  type RequestPayload,
  router,
  type UrlMethodPair,
  type UseFormArguments,
  type UseFormSubmitArguments,
  type UseFormSubmitOptions,
  UseFormUtils,
  type UseFormWithPrecognitionArguments,
  type VisitOptions,
} from '@inertiajs/core'
import { FormStore, type FormState, type FormValidation } from './formStore'
import { useStore } from './useStore'

export interface InertiaForm<TForm extends object> extends FormState<TForm> {
  /** Submits the form with an Inertia visit. Without a method and URL, the Precognition endpoint is used. */
  submit: (...args: UseFormSubmitArguments) => void
  get: (url: string, options?: UseFormSubmitOptions) => void
  post: (url: string, options?: UseFormSubmitOptions) => void
  put: (url: string, options?: UseFormSubmitOptions) => void
  patch: (url: string, options?: UseFormSubmitOptions) => void
  delete: (url: string, options?: UseFormSubmitOptions) => void
  /** Cancels the submission in progress. */
  cancel: () => void
  /** Leaves the given fields out of the remembered data (e.g. passwords). */
  dontRemember: <K extends FormDataKeys<TForm>>(...fields: K[]) => this
  /** Updates the page props optimistically on the next submit, rolled back if it fails. */
  optimistic: <TProps>(callback: OptimisticCallback<TProps>) => this
  withPrecognition: (...args: UseFormWithPrecognitionArguments) => InertiaPrecognitiveForm<TForm>
}

export type InertiaPrecognitiveForm<TForm extends object> = InertiaForm<TForm> &
  FormValidation<TForm, InertiaPrecognitiveForm<TForm>>

/** The form store behind `useForm()`: submits with Inertia visits through the router. */
export class InertiaFormStore<TForm extends object> extends FormStore<TForm, InertiaPrecognitiveForm<TForm>> {
  private cancelToken: CancelToken | null = null
  private pendingOptimistic: OptimisticCallback | null = null

  protected override createSnapshot(): InertiaPrecognitiveForm<TForm> {
    return {
      ...super.createSnapshot(),
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

  submit = (...args: UseFormSubmitArguments): void => {
    const { method, url, options } = UseFormUtils.parseSubmitArguments(args, this.precognitionEndpoint)
    const optimistic = options.optimistic ?? this.pendingOptimistic ?? undefined

    this.pendingOptimistic = null

    const visitOptions: VisitOptions = {
      ...options,
      optimistic,
      onCancelToken: (token) => {
        this.cancelToken = token

        return options.onCancelToken?.(token)
      },
      onBefore: (visit) => {
        this.beforeSubmit()

        return options.onBefore?.(visit)
      },
      onStart: (visit) => {
        this.update({ processing: true })

        return options.onStart?.(visit)
      },
      onProgress: (event) => {
        this.update({ progress: event ?? null })

        return options.onProgress?.(event)
      },
      onSuccess: async (page) => {
        this.markAsSuccessful()

        const result = options.onSuccess ? await options.onSuccess(page) : null

        this.updateDefaultsAfterSuccess()

        return result
      },
      onError: (errors) => {
        this.replaceErrors(errors)

        return options.onError?.(errors)
      },
      onFinish: (visit) => {
        this.finishSubmit()
        this.cancelToken = null

        return options.onFinish?.(visit)
      },
    }

    const data = this.transformedData() as RequestPayload

    if (method === 'delete') {
      router.delete(url, { ...visitOptions, data })
    } else {
      router[method](url, data, visitOptions)
    }
  }

  get = (url: string, options?: UseFormSubmitOptions) => this.submit('get', url, options)
  post = (url: string, options?: UseFormSubmitOptions) => this.submit('post', url, options)
  put = (url: string, options?: UseFormSubmitOptions) => this.submit('put', url, options)
  patch = (url: string, options?: UseFormSubmitOptions) => this.submit('patch', url, options)
  delete = (url: string, options?: UseFormSubmitOptions) => this.submit('delete', url, options)

  cancel = (): void => {
    this.cancelToken?.cancel()
  }

  dontRemember = (...fields: string[]): InertiaPrecognitiveForm<TForm> => {
    this.excludeFromRemembering(fields)

    return this.getSnapshot()
  }

  optimistic = (callback: OptimisticCallback<any>): InertiaPrecognitiveForm<TForm> => {
    this.pendingOptimistic = callback

    return this.getSnapshot()
  }
}

/**
 * A form helper: holds the form data, errors and submission state, and submits with Inertia visits.
 *
 * ```ts
 * useForm({ email: '' })                        // data (or a function returning it)
 * useForm('CreateUser', { email: '' })          // remembered in the history state under this key
 * useForm('post', '/users', { email: '' })      // with Precognition (live validation)
 * useForm(store(), { email: '' })               // with Precognition, for a Wayfinder route
 * ```
 */
export default function useForm<TForm extends FormDataType<TForm>>(
  method: Method | (() => Method),
  url: string | (() => string),
  data: TForm | (() => TForm),
): InertiaPrecognitiveForm<TForm>
export default function useForm<TForm extends FormDataType<TForm>>(
  urlMethodPair: UrlMethodPair | (() => UrlMethodPair),
  data: TForm | (() => TForm),
): InertiaPrecognitiveForm<TForm>
export default function useForm<TForm extends FormDataType<TForm>>(
  rememberKey: string,
  data: TForm | (() => TForm),
): InertiaForm<TForm>
export default function useForm<TForm extends FormDataType<TForm>>(data: TForm | (() => TForm)): InertiaForm<TForm>
export default function useForm<TForm extends FormDataType<TForm>>(): InertiaForm<TForm>
export default function useForm<TForm extends FormDataType<TForm>>(
  ...args: UseFormArguments<TForm>
): InertiaForm<TForm> | InertiaPrecognitiveForm<TForm> {
  return useStore(() => new InertiaFormStore<TForm>(UseFormUtils.parseUseFormArguments<TForm>(...args)))
}
