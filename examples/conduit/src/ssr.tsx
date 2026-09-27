import { createInertiaApp } from '@adwd/inertia-preact'
import type { Page } from '@inertiajs/core'
import { renderToString } from 'preact-render-to-string'
import { layout, resolve, title } from './app.ts'
import type { SharedProps } from './types.ts'

/** Renders a page to HTML on the server */
export function renderPage(page: Page<SharedProps>) {
  return createInertiaApp({ page, render: renderToString, resolve, title, layout })
}
