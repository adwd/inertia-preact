import {
  config,
  type ErrorValue,
  type FormComponentProps,
  type FormComponentRef,
  FormComponentResetSymbol,
  type FormComponentSlotProps,
  type FormDataConvertible,
  type FormDataErrors,
  formDataToObject,
  isUrlMethodPair,
  mergeDataIntoQueryString,
  type Method,
  resetFormFields,
  resolveUrlMethodPairComponent,
  UseFormUtils,
  type VisitOptions,
} from '@inertiajs/core'
import { isEqual } from 'es-toolkit'
import type { NamedInputEvent, ValidationConfig, Validator } from 'laravel-precognition'
import {
  Component,
  type ComponentChildren,
  createContext,
  createRef,
  type FormHTMLAttributes,
  h,
  type TargetedSubmitEvent,
} from 'preact'
import { useContext } from 'preact/hooks'
import { InertiaFormStore } from './useForm'

export type FormProps<TForm extends object = Record<string, any>> = FormComponentProps<TForm> &
  Omit<FormHTMLAttributes<HTMLFormElement>, keyof FormComponentProps<TForm> | 'children' | 'ref'> & {
    /** The form contents, or a function that receives the form state and methods. */
    children?: ComponentChildren | ((form: FormComponentSlotProps<TForm>) => ComponentChildren)
  }

type Submitter = HTMLElement | null | undefined

const noop = () => {}

const FormContext = createContext<FormComponentRef | undefined>(undefined)
FormContext.displayName = 'InertiaForm'

/** The state and methods of the closest `<Form>`, or `undefined` outside of one. */
export function useFormContext<TForm extends object = Record<string, any>>(): FormComponentRef<TForm> | undefined {
  return useContext(FormContext) as FormComponentRef<TForm> | undefined
}

/**
 * A `<form>` that submits with an Inertia visit. The data is read from the form's fields, like a regular
 * HTML form, so they don't need to be controlled.
 *
 * The form state and methods are passed to `children` when it is a function, provided to descendants
 * through `useFormContext()`, and available on the component instance through a `ref`.
 */
export default class Form<TForm extends object = Record<string, any>>
  extends Component<FormProps<TForm>, { isDirty: boolean }>
  implements FormComponentRef<TForm>
{
  static override displayName = 'InertiaForm'

  override state = { isDirty: false }

  private readonly formElement = createRef<HTMLFormElement>()
  private readonly store: InertiaFormStore<Record<string, FormDataConvertible>>
  private defaultData = new FormData()
  private unsubscribe = noop

  constructor(props: FormProps<TForm>) {
    super(props)

    this.store = new InertiaFormStore({
      data: {},
      // For Precognition, which validates against the form's action
      precognitionEndpoint: () => ({ method: this.method(), url: this.urlAndData()[0] }),
    })

    this.store.transform(this.transformedData)
    this.configureStore()
  }

  override componentDidMount(): void {
    this.defaultData = this.getFormData()
    this.store.setDefaults(this.getData())
    this.unsubscribe = this.store.subscribe(() => this.forceUpdate())

    for (const event of ['input', 'change', 'reset']) {
      this.formElement.current!.addEventListener(event, this.updateDirtyState)
    }
  }

  override componentDidUpdate(previousProps: FormProps<TForm>): void {
    if (
      previousProps.validationTimeout !== this.props.validationTimeout ||
      previousProps.validateFiles !== this.props.validateFiles ||
      previousProps.withAllErrors !== this.props.withAllErrors
    ) {
      this.configureStore()
    }
  }

  override componentWillUnmount(): void {
    for (const event of ['input', 'change', 'reset']) {
      this.formElement.current?.removeEventListener(event, this.updateDirtyState)
    }

    this.unsubscribe()

    if (this.props.cancelOnUnmount) {
      this.store.cancel()
    }
  }

  // State

  get errors(): FormDataErrors<TForm> {
    return this.store.errors as FormDataErrors<TForm>
  }

  get hasErrors(): boolean {
    return Object.keys(this.store.errors).length > 0
  }

  get processing(): boolean {
    return this.store.processing
  }

  get progress() {
    return this.store.progress
  }

  get wasSuccessful(): boolean {
    return this.store.wasSuccessful
  }

  get recentlySuccessful(): boolean {
    return this.store.recentlySuccessful
  }

  get isDirty(): boolean {
    return this.state.isDirty
  }

  get validating(): boolean {
    return this.store.validating
  }

  // Methods

  /** Submits the form, optionally as if the given submit button was used. */
  submit = (submitter?: Submitter): void => {
    const {
      headers = {},
      queryStringArrayFormat = 'brackets',
      errorBag = null,
      showProgress = true,
      invalidateCacheTags = [],
      transform = (data: TForm) => data as Record<string, FormDataConvertible>,
      optimistic,
      options = {},
      onCancelToken = noop,
      onBefore = noop,
      onStart = noop,
      onProgress = noop,
      onFinish = noop,
      onCancel = noop,
      onSuccess = noop,
      onError = noop,
      onHttpException = noop,
      onNetworkError = noop,
      onFlash = noop,
      onSubmitComplete = noop,
      resetOnSuccess = false,
      resetOnError = false,
      setDefaultsOnSuccess = false,
    } = this.props

    const method = this.method()
    const [url, data] = this.urlAndData(submitter)

    if (submitter?.getAttribute('formtarget') === '_blank' && method === 'get') {
      window.open(url, '_blank')
      return
    }

    const submitOptions: Omit<VisitOptions, 'data' | 'onPrefetched' | 'onPrefetching'> = {
      headers,
      queryStringArrayFormat,
      errorBag,
      showProgress,
      invalidateCacheTags,
      component: this.component(),
      optimistic: optimistic ? (pageProps) => optimistic(pageProps, data as TForm) : undefined,
      onCancelToken,
      onBefore,
      onStart,
      onProgress,
      onFinish,
      onCancel,
      onHttpException,
      onNetworkError,
      onFlash,
      onSuccess: async (page) => {
        const result = await onSuccess(page)

        onSubmitComplete({ reset: this.reset, defaults: this.defaults })
        this.resetFields(resetOnSuccess)

        if (setDefaultsOnSuccess) {
          this.defaults()
        }

        return result
      },
      onError: (errors) => {
        onError(errors)
        this.resetFields(resetOnError)
      },
      ...options,
    }

    // Submit the data read above, which includes the submitter's name and value
    this.store.transform(() => transform(data as TForm))
    this.store.submit(method, url, submitOptions)
    this.store.transform(this.transformedData)
  }

  cancel = (): void => this.store.cancel()

  /** Resets the fields (or the given ones) to their defaults. */
  reset = (...fields: string[]): void => {
    if (this.formElement.current) {
      resetFormFields(this.formElement.current, this.defaultData, fields)
    }

    this.store.reset(...fields)
  }

  clearErrors = (...fields: string[]): void => this.store.clearErrors(...fields)

  resetAndClearErrors = (...fields: string[]): void => {
    this.clearErrors(...fields)
    this.reset(...fields)
  }

  setError = ((fieldOrErrors: string | FormDataErrors<TForm>, value?: ErrorValue): void =>
    this.store.setError(fieldOrErrors as string, value)) as FormComponentRef<TForm>['setError']

  /** Makes the current field values the defaults. */
  defaults = (): void => {
    this.defaultData = this.getFormData()
    this.setState({ isDirty: false })
  }

  getFormData = (submitter?: Submitter): FormData =>
    this.formElement.current ? new FormData(this.formElement.current, submitter) : new FormData()

  // FormData instances can't be compared (for isDirty), and nested fields are only supported as objects
  getData = (submitter?: Submitter): TForm => formDataToObject(this.getFormData(submitter)) as TForm

  // Precognition

  validator = (): Validator => this.store.validator()

  validate = (field?: string | NamedInputEvent | ValidationConfig, validationConfig?: ValidationConfig): void => {
    this.store.validate(...UseFormUtils.mergeHeadersForValidation(field, validationConfig, this.props.headers))
  }

  valid = (field: string): boolean => this.store.valid(field)

  invalid = (field: string): boolean => this.store.invalid(field)

  touch = (...fields: string[]): void => {
    this.store.touch(fields)
  }

  touched = (field?: string): boolean => this.store.touched(field)

  override render() {
    const {
      action = '',
      method: _method,
      headers: _headers,
      queryStringArrayFormat: _queryStringArrayFormat,
      errorBag: _errorBag,
      showProgress: _showProgress,
      transform: _transform,
      optimistic: _optimistic,
      options: _options,
      onStart: _onStart,
      onProgress: _onProgress,
      onFinish: _onFinish,
      onBefore: _onBefore,
      onCancel: _onCancel,
      onSuccess: _onSuccess,
      onError: _onError,
      onHttpException: _onHttpException,
      onNetworkError: _onNetworkError,
      onFlash: _onFlash,
      onCancelToken: _onCancelToken,
      onSubmitComplete: _onSubmitComplete,
      disableWhileProcessing = false,
      cancelOnUnmount: _cancelOnUnmount,
      resetOnError: _resetOnError,
      resetOnSuccess: _resetOnSuccess,
      setDefaultsOnSuccess: _setDefaultsOnSuccess,
      invalidateCacheTags: _invalidateCacheTags,
      validateFiles: _validateFiles,
      validationTimeout: _validationTimeout,
      withAllErrors: _withAllErrors,
      component: _component,
      instant: _instant,
      children,
      ...attributes
    } = this.props

    const form = this.slotProps()

    return h(
      FormContext.Provider,
      { value: form as unknown as FormComponentRef },
      h(
        'form',
        {
          ...attributes,
          ref: this.formElement,
          action: isUrlMethodPair(action) ? action.url : action,
          method: this.method(),
          onSubmit: this.handleSubmit,
          inert: disableWhileProcessing && this.store.processing,
        },
        typeof children === 'function' ? children(form) : children,
      ),
    )
  }

  private slotProps(): FormComponentSlotProps<TForm> {
    return {
      errors: this.errors,
      hasErrors: this.hasErrors,
      processing: this.processing,
      progress: this.progress,
      wasSuccessful: this.wasSuccessful,
      recentlySuccessful: this.recentlySuccessful,
      isDirty: this.isDirty,
      validating: this.validating,
      submit: this.submit,
      cancel: this.cancel,
      reset: this.reset,
      clearErrors: this.clearErrors,
      resetAndClearErrors: this.resetAndClearErrors,
      setError: this.setError,
      defaults: this.defaults,
      getData: this.getData,
      getFormData: this.getFormData,
      validator: this.validator,
      validate: this.validate,
      valid: this.valid,
      invalid: this.invalid,
      touch: this.touch,
      touched: this.touched,
    }
  }

  private configureStore(): void {
    const { validationTimeout = 1500, validateFiles = false, withAllErrors = null } = this.props

    this.store.setValidationTimeout(validationTimeout)

    if (validateFiles) {
      this.store.validateFiles()
    } else {
      this.store.withoutFileValidation()
    }

    if (withAllErrors ?? config.get('form.withAllErrors')) {
      this.store.withAllErrors()
    }
  }

  private method(): Method {
    const { action = '', method = 'get' } = this.props

    return isUrlMethodPair(action) ? action.method : (method.toLowerCase() as Method)
  }

  private component() {
    const { action = '', component = null, instant = false } = this.props

    return component ?? (instant && isUrlMethodPair(action) ? resolveUrlMethodPairComponent(action) : null)
  }

  private urlAndData(submitter?: Submitter): [string, Record<string, FormDataConvertible>] {
    const { action = '', queryStringArrayFormat = 'brackets' } = this.props

    return mergeDataIntoQueryString(
      this.method(),
      isUrlMethodPair(action) ? action.url : action,
      this.getData(submitter) as Record<string, FormDataConvertible>,
      queryStringArrayFormat,
    )
  }

  private transformedData = (): Record<string, FormDataConvertible> => {
    const { transform = (data: TForm) => data as Record<string, FormDataConvertible> } = this.props

    return transform(this.urlAndData()[1] as TForm)
  }

  private resetFields(fields: boolean | string[]): void {
    if (fields === true) {
      this.reset()
    } else if (Array.isArray(fields) && fields.length > 0) {
      this.reset(...fields)
    }
  }

  private handleSubmit = (event: TargetedSubmitEvent<HTMLFormElement>): void => {
    event.preventDefault()
    this.submit(event.submitter)
  }

  private updateDirtyState = (event: Event): void => {
    if (event.type === 'reset') {
      if ((event as CustomEvent).detail?.[FormComponentResetSymbol]) {
        // Reset programmatically (see reset()), so prevent the browser from resetting the fields as well
        event.preventDefault()
      }

      this.setState({ isDirty: false })
      return
    }

    this.setState({ isDirty: !isEqual(this.getData(), formDataToObject(this.defaultData)) })
  }
}
