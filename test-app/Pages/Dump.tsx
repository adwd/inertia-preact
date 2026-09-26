import type { Method } from '@inertiajs/core'
import { usePage } from 'inertia-preact'
import { useMemo, useLayoutEffect } from 'preact/hooks'
import type { MulterFile } from '../types'

export default ({
  headers,
  method,
  form,
  query,
  url,
  files,
}: {
  headers: Record<string, string>
  method: Method
  form: Record<string, unknown>
  query: Record<string, unknown>
  url: string
  files: MulterFile[] | object
}) => {
  const page = usePage()

  const dump = useMemo(
    () => ({
      headers,
      method,
      form,
      files: files ? files : {},
      query,
      url,
      $page: page,
    }),
    [headers, method, form, files, query, url, page],
  )

  // A layout effect, so the data is published as soon as the page is rendered. Tests read it right after
  // the URL changes, and Preact runs effects only after the next paint.
  useLayoutEffect(() => {
    window._inertia_request_dump = dump
  }, [dump])

  return (
    <div>
      <div class="text">This is Inertia page component containing a data dump of the request</div>
      <hr />
      <pre class="dump">{JSON.stringify(dump, null, 2)}</pre>
    </div>
  )
}
