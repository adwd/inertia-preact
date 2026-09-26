import {
  config,
  type Errors,
  type ErrorValue,
  type FormDataErrors,
  type FormDataKeys,
  type FormDataValues,
  type Progress,
  router,
  type UrlMethodPair,
  type UseFormTransformCallback,
  UseFormUtils,
  type UseFormWithPrecognitionArguments,
} from '@inertiajs/core'
import { cloneDeep, isEqual } from 'es-toolkit'
import { get, has, set } from 'es-toolkit/compat'
import {
  createValidator,
  type NamedInputEvent,
  type PrecognitionPath,
  resolveName,
  toSimpleValidationErrors,
  type ValidationConfig,
  type Validator,
} from 'laravel-precognition'

const isServer = typeof window === 'undefined'

type PrecognitionValidationConfig<TKeys> = ValidationConfig & {
  only?: TKeys[] | Iterable<TKeys> | ArrayLike<TKeys>
}

export type SetDataByKeyValuePair<TForm> = <K extends FormDataKeys<TForm>>(
  field: K,
  value: FormDataValues<TForm, K>,
) => void
export type SetDataByObject<TForm> = (data: Partial<TForm>) => void
export type SetDataByMethod<TForm> = (update: (data: TForm) => TForm) => void

// An intersection rather than overloads, so a form can be passed where a form with compatible data is expected
export type SetData<TForm> = SetDataByKeyValuePair<TForm> & SetDataByObject<TForm> & SetDataByMethod<TForm>

/** The state and methods shared by `useForm()` and `useHttp()`. */
export interface FormState<TForm extends object> {
  /** The current form data. */
  data: TForm
  /** Whether the data differs from the defaults. */
  isDirty: boolean
  errors: FormDataErrors<TForm>
  hasErrors: boolean
  processing: boolean
  progress: Progress | null
  wasSuccessful: boolean
  /** True for a moment (`form.recentlySuccessfulDuration`, 2 seconds by default) after a successful submit. */
  recentlySuccessful: boolean
  /**
   * Updates the data: a single field (dot notation for nested fields), several fields at once (merged into
   * the current data), or everything through a function of the current data.
   */
  setData: SetData<TForm>
  /** Transforms the data before it is submitted (or validated). */
  transform: (callback: UseFormTransformCallback<TForm>) => void
  /** Sets the defaults to the current data, or updates some of them. */
  setDefaults: {
    (): void
    <K extends FormDataKeys<TForm>>(field: K, value: FormDataValues<TForm, K>): void
    (fields: Partial<TForm>): void
  }
  /** Resets the data (or the given fields) to the defaults. */
  reset: <K extends FormDataKeys<TForm>>(...fields: K[]) => void
  clearErrors: <K extends FormDataKeys<TForm>>(...fields: K[]) => void
  resetAndClearErrors: <K extends FormDataKeys<TForm>>(...fields: K[]) => void
  setError: {
    <K extends FormDataKeys<TForm>>(field: K, value: ErrorValue): void
    (errors: FormDataErrors<TForm>): void
  }
}

/** Precognition (live validation), available after `withPrecognition()`. */
export interface FormValidation<TForm extends object, TSelf> {
  validating: boolean
  validator: () => Validator
  validate: <K extends FormDataKeys<TForm> | PrecognitionPath<TForm>>(
    field?: K | NamedInputEvent | PrecognitionValidationConfig<K>,
    config?: PrecognitionValidationConfig<K>,
  ) => TSelf
  valid: <K extends FormDataKeys<TForm>>(field: K) => boolean
  invalid: <K extends FormDataKeys<TForm>>(field: K) => boolean
  touch: <K extends FormDataKeys<TForm>>(field: K | NamedInputEvent | Array<K>, ...fields: K[]) => TSelf
  touched: <K extends FormDataKeys<TForm>>(field?: K) => boolean
  setValidationTimeout: (duration: number) => TSelf
  validateFiles: () => TSelf
  withoutFileValidation: () => TSelf
  withAllErrors: () => TSelf
  // Compatibility with the laravel-precognition form helpers
  setErrors: (errors: FormDataErrors<TForm>) => TSelf
  forgetError: <K extends FormDataKeys<TForm> | NamedInputEvent>(field: K) => TSelf
}

interface FormStoreState<TForm extends object> {
  data: TForm
  defaults: TForm
  errors: FormDataErrors<TForm>
  processing: boolean
  progress: Progress | null
  wasSuccessful: boolean
  recentlySuccessful: boolean
  validating: boolean
  touchedFields: string[]
  validFields: string[]
}

export interface FormStoreOptions<TForm extends object> {
  data: TForm | (() => TForm)
  /** Keeps the data and errors in the history state under this key, so they survive navigating back. */
  rememberKey?: string | null
  precognitionEndpoint?: (() => UrlMethodPair) | null
}

/**
 * The state of a form, independent of Preact. Updates are immutable: every change creates new `data` /
 * `errors` objects and a new snapshot, while the methods keep their identity for the lifetime of the store.
 * Hooks and components subscribe to it and render its snapshot.
 */
export class FormStore<TForm extends object, TSnapshot = unknown> {
  data: TForm
  defaults: TForm
  errors: FormDataErrors<TForm>
  processing = false
  progress: Progress | null = null
  wasSuccessful = false
  recentlySuccessful = false
  validating = false
  touchedFields: string[] = []
  validFields: string[] = []

  /** Increases on every change. */
  version = 0

  protected transformCallback: UseFormTransformCallback<TForm> = (data) => data
  protected precognitionEndpoint: (() => UrlMethodPair) | null
  protected validatorInstance: Validator | null = null
  protected withAllErrorsEnabled: boolean | null = null
  protected defaultsSetInOnSuccess = false
  protected rememberExcludeKeys: string[] = []

  private readonly dataOption: TForm | (() => TForm)
  private readonly rememberKey: string | null
  private readonly listeners = new Set<() => void>()
  private notifyScheduled = false
  private recentlySuccessfulTimeout: ReturnType<typeof setTimeout> | undefined
  private snapshot: TSnapshot | null = null
  private snapshotVersion = -1
  private rememberedData: unknown = undefined
  private rememberedErrors: unknown = undefined

  constructor({ data, rememberKey = null, precognitionEndpoint = null }: FormStoreOptions<TForm>) {
    this.dataOption = data
    this.rememberKey = rememberKey
    this.precognitionEndpoint = precognitionEndpoint

    const initialData = cloneDeep(this.resolveData())
    const restoredData = this.restore('data') as TForm | undefined
    const restoredErrors = this.restore('errors') as FormDataErrors<TForm> | undefined

    this.defaults = initialData
    this.data = restoredData !== undefined ? restoredData : cloneDeep(initialData)
    this.errors = restoredErrors !== undefined ? restoredErrors : ({} as FormDataErrors<TForm>)

    if (precognitionEndpoint) {
      // Not withPrecognition(): subclass fields don't exist yet, so no snapshot can be created here
      this.enablePrecognition(precognitionEndpoint)
    }
  }

  // Subscription

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    this.remember()

    return () => this.listeners.delete(listener)
  }

  getSnapshot(): TSnapshot {
    if (this.snapshotVersion !== this.version) {
      this.snapshot = this.createSnapshot()
      this.snapshotVersion = this.version
    }

    return this.snapshot!
  }

  protected createSnapshot(): TSnapshot {
    return {
      data: this.data,
      isDirty: !isEqual(this.data, this.defaults),
      errors: this.errors,
      hasErrors: Object.keys(this.errors).length > 0,
      processing: this.processing,
      progress: this.progress,
      wasSuccessful: this.wasSuccessful,
      recentlySuccessful: this.recentlySuccessful,
      setData: this.setData,
      transform: this.transform,
      setDefaults: this.setDefaults,
      reset: this.reset,
      clearErrors: this.clearErrors,
      resetAndClearErrors: this.resetAndClearErrors,
      setError: this.setError,
      withPrecognition: this.withPrecognition,
      // Precognition
      validating: this.validating,
      validator: this.validator,
      validate: this.validate,
      valid: this.valid,
      invalid: this.invalid,
      touch: this.touch,
      touched: this.touched,
      setValidationTimeout: this.setValidationTimeout,
      validateFiles: this.validateFiles,
      withoutFileValidation: this.withoutFileValidation,
      withAllErrors: this.withAllErrors,
      setErrors: this.setErrors,
      forgetError: this.forgetError,
    } as TSnapshot
  }

  /** Applies a change to the state. */
  protected update(changes: Partial<FormStoreState<TForm>>): void {
    Object.assign(this, changes)
    this.changed()
  }

  /** Bumps the version and notifies the subscribers, once per tick. */
  protected changed(): void {
    this.version++

    if (this.notifyScheduled) {
      return
    }

    this.notifyScheduled = true

    queueMicrotask(() => {
      this.notifyScheduled = false
      this.remember()
      this.listeners.forEach((listener) => listener())
    })
  }

  // Data

  setData = (keyOrData: string | Partial<TForm> | ((data: TForm) => TForm), value?: unknown): void => {
    if (typeof keyOrData === 'string') {
      this.update({ data: set(cloneDeep(this.data), keyOrData, value) })
    } else if (typeof keyOrData === 'function') {
      this.update({ data: keyOrData(this.data) })
    } else {
      this.update({ data: { ...this.data, ...keyOrData } })
    }
  }

  transform = (callback: UseFormTransformCallback<TForm>): void => {
    this.transformCallback = callback
  }

  /** The data as it will be submitted. */
  transformedData(): object {
    return this.transformCallback(this.data)
  }

  setDefaults = (fieldOrFields?: string | Partial<TForm>, value?: unknown): void => {
    if (typeof this.dataOption === 'function') {
      throw new Error('You cannot call `setDefaults()` when using a function to define your form data.')
    }

    this.defaultsSetInOnSuccess = true

    const defaults =
      fieldOrFields === undefined
        ? cloneDeep(this.data)
        : typeof fieldOrFields === 'string'
          ? set(cloneDeep(this.defaults), fieldOrFields, value)
          : { ...cloneDeep(this.defaults), ...fieldOrFields }

    this.update({ defaults })
    this.validatorInstance?.defaults(defaults as Record<string, unknown>)
  }

  reset = (...fields: string[]): void => {
    // With a data function, resetting uses fresh data from it, which also becomes the new defaults
    const dataIsFunction = typeof this.dataOption === 'function'
    const source = dataIsFunction ? cloneDeep(this.resolveData()) : this.defaults

    if (fields.length === 0) {
      this.update({ data: cloneDeep(source), ...(dataIsFunction ? { defaults: source } : {}) })
    } else {
      const resettable = fields.filter((field) => has(source, field))
      const data = cloneDeep(this.data)
      const defaults = dataIsFunction ? cloneDeep(this.defaults) : this.defaults

      resettable.forEach((field) => {
        set(data, field, cloneDeep(get(source, field)))

        if (dataIsFunction) {
          set(defaults, field, cloneDeep(get(source, field)))
        }
      })

      this.update({ data, defaults })
    }

    this.validatorInstance?.reset(...fields)
  }

  // Errors

  setError = (fieldOrErrors: string | FormDataErrors<TForm>, value?: ErrorValue): void => {
    const errors = {
      ...this.errors,
      ...(typeof fieldOrErrors === 'string' ? { [fieldOrErrors]: value } : fieldOrErrors),
    } as FormDataErrors<TForm>

    this.update({ errors })
    this.validatorInstance?.setErrors(errors as Errors)
  }

  clearErrors = (...fields: string[]): void => {
    const errors = Object.fromEntries(
      Object.entries(this.errors).filter(([field]) => fields.length > 0 && !fields.includes(field)),
    ) as FormDataErrors<TForm>

    this.update({ errors })

    if (fields.length === 0) {
      this.validatorInstance?.setErrors({})
    } else {
      fields.forEach((field) => this.validatorInstance?.forgetError(field))
    }
  }

  resetAndClearErrors = (...fields: string[]): void => {
    this.reset(...fields)
    this.clearErrors(...fields)
  }

  // Submission lifecycle (used by the subclasses)

  protected beforeSubmit(): void {
    this.defaultsSetInOnSuccess = false
    clearTimeout(this.recentlySuccessfulTimeout)
    this.update({ wasSuccessful: false, recentlySuccessful: false })
  }

  protected markAsSuccessful(): void {
    this.clearErrors()
    this.update({ wasSuccessful: true, recentlySuccessful: true })

    clearTimeout(this.recentlySuccessfulTimeout)
    this.recentlySuccessfulTimeout = setTimeout(
      () => this.update({ recentlySuccessful: false }),
      config.get('form.recentlySuccessfulDuration'),
    )
  }

  /** Makes the submitted data the new defaults, unless `onSuccess` set the defaults itself. */
  protected updateDefaultsAfterSuccess(): void {
    if (!this.defaultsSetInOnSuccess) {
      this.update({ defaults: cloneDeep(this.data) })
    }
  }

  protected finishSubmit(): void {
    this.update({ processing: false, progress: null })
  }

  protected replaceErrors(errors: Errors): void {
    this.clearErrors()
    this.setError(errors as FormDataErrors<TForm>)
  }

  protected allErrorsEnabled(): boolean {
    return this.withAllErrorsEnabled ?? config.get('form.withAllErrors')
  }

  // Precognition

  withPrecognition = (...args: UseFormWithPrecognitionArguments): TSnapshot => {
    this.enablePrecognition(UseFormUtils.createWayfinderCallback(...args))

    return this.getSnapshot()
  }

  private enablePrecognition(endpoint: () => UrlMethodPair): void {
    this.precognitionEndpoint = endpoint

    if (!this.validatorInstance) {
      const validator = createValidator(
        (client) => {
          const { method, url } = this.precognitionEndpoint!()

          return client[method](url, this.transformedData() as Record<string, unknown>)
        },
        cloneDeep(this.defaults) as Record<string, unknown>,
      )

      validator
        .on('validatingChanged', () => this.update({ validating: validator.validating() }))
        .on('validatedChanged', () => this.update({ validFields: validator.valid() }))
        .on('touchedChanged', () => this.update({ touchedFields: validator.touched() }))
        .on('errorsChanged', () => {
          const errors = this.allErrorsEnabled() ? validator.errors() : toSimpleValidationErrors(validator.errors())

          this.update({ errors: errors as FormDataErrors<TForm>, validFields: validator.valid() })
        })

      this.validatorInstance = validator
    }
  }

  validator = (): Validator => {
    if (!this.validatorInstance) {
      throw new Error('Precognition is not enabled for this form. Call `withPrecognition()` first.')
    }

    return this.validatorInstance
  }

  validate = (field?: string | NamedInputEvent | ValidationConfig, validationConfig?: ValidationConfig): TSnapshot => {
    if (typeof field === 'object' && !('target' in field)) {
      validationConfig = field
      field = undefined
    }

    if (field === undefined) {
      this.validator().validate(validationConfig)
    } else {
      const name = resolveName(field)

      this.validator().validate(name, get(this.transformedData(), name), validationConfig)
    }

    return this.getSnapshot()
  }

  valid = (field: string): boolean => this.validFields.includes(field)

  invalid = (field: string): boolean => field in this.errors

  touch = (field: string | NamedInputEvent | string[], ...fields: string[]): TSnapshot => {
    if (Array.isArray(field)) {
      this.validatorInstance?.touch(field)
    } else if (typeof field === 'string') {
      this.validatorInstance?.touch([field, ...fields])
    } else {
      this.validatorInstance?.touch(field)
    }

    return this.getSnapshot()
  }

  touched = (field?: string): boolean =>
    typeof field === 'string' ? this.touchedFields.includes(field) : this.touchedFields.length > 0

  setValidationTimeout = (duration: number): TSnapshot => {
    this.validatorInstance?.setTimeout(duration)

    return this.getSnapshot()
  }

  validateFiles = (): TSnapshot => {
    this.validatorInstance?.validateFiles()

    return this.getSnapshot()
  }

  withoutFileValidation = (): TSnapshot => {
    this.validatorInstance?.withoutFileValidation()

    return this.getSnapshot()
  }

  withAllErrors = (): TSnapshot => {
    this.withAllErrorsEnabled = true

    return this.getSnapshot()
  }

  setErrors = (errors: FormDataErrors<TForm>): TSnapshot => {
    this.setError(errors)

    return this.getSnapshot()
  }

  forgetError = (field: string | NamedInputEvent): TSnapshot => {
    this.clearErrors(resolveName(field))

    return this.getSnapshot()
  }

  // Remembering

  protected excludeFromRemembering(fields: string[]): void {
    this.rememberExcludeKeys = fields
  }

  private resolveData(): TForm {
    return typeof this.dataOption === 'function' ? (this.dataOption as () => TForm)() : this.dataOption
  }

  private restore(part: 'data' | 'errors'): unknown {
    return this.rememberKey && !isServer ? router.restore(`${this.rememberKey}:${part}`) : undefined
  }

  // Only while subscribed (mounted): a form that finishes submitting after its page was left must not
  // write into the history state of the page that replaced it.
  private remember(): void {
    if (!this.rememberKey || isServer || this.listeners.size === 0) {
      return
    }

    if (this.data !== this.rememberedData) {
      const data = { ...this.data } as Record<string, unknown>
      this.rememberExcludeKeys.forEach((key) => delete data[key])
      router.remember(data, `${this.rememberKey}:data`)
      this.rememberedData = this.data
    }

    if (this.errors !== this.rememberedErrors) {
      router.remember(this.errors, `${this.rememberKey}:errors`)
      this.rememberedErrors = this.errors
    }
  }
}
