import type { Context } from 'hono'

export type Errors = Record<string, string>

/** The fields of a form, sent as JSON by Inertia, or as form data */
export async function formInput(c: Context): Promise<Record<string, unknown>> {
  if (c.req.header('Content-Type')?.includes('application/json')) {
    const json: unknown = await c.req.json().catch(() => ({}))
    return typeof json === 'object' && json !== null && !Array.isArray(json) ? (json as Record<string, unknown>) : {}
  }

  return c.req.parseBody({ all: true })
}

export function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export function textList(value: unknown) {
  const values = Array.isArray(value) ? value : value === undefined ? [] : [value]
  return values.map(text).filter((item) => item !== '')
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function isHttpUrl(value: string) {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

/** Validates the fields with the given checks, keeping the first error of each field */
export function validate(checks: Array<[field: string, failed: boolean, message: string]>): Errors {
  const errors: Errors = {}

  for (const [field, failed, message] of checks) {
    if (failed && !(field in errors)) {
      errors[field] = message
    }
  }

  return errors
}
