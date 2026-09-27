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

export const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

export const textList = (value: unknown) =>
  (Array.isArray(value) ? value : value === undefined ? [] : [value]).map(text).filter((item) => item !== '')

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

export const isHttpUrl = (value: string) => {
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
