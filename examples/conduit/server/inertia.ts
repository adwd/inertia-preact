import { inertia, serializePage, type PageObject } from '@hono/inertia'
import type { Page } from '@inertiajs/core'
import { renderPage } from '../src/ssr.tsx'
import type { SharedProps } from '../src/types.ts'
import type { Env } from './session.ts'

export interface Assets {
  /** The tags loading the client (script and styles) */
  head: string
  /** Changes with the client build, so clients running an older build reload */
  version: string | null
}

// The shared Conduit theme, with the fonts and icons it relies on (see the RealWorld templates)
const theme = `
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/ionicons/2.0.1/css/ionicons.min.css" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400,600,700|Lora:400,700" />
    <link rel="stylesheet" href="/styles.css" />`

async function render(page: PageObject) {
  try {
    return await renderPage(page as Page<SharedProps>)
  } catch (error) {
    // The client renders the page when the server can't
    console.error('Server-side rendering failed, falling back to client-side rendering', error)

    return {
      head: [],
      body: `<script data-page="app" type="application/json">${serializePage(page)}</script><div id="app"></div>`,
    }
  }
}

export function inertiaPages(assets: Assets) {
  return inertia<Env>()({
    version: assets.version,
    share: (c): SharedProps => {
      const user = c.get('user')

      return {
        auth: {
          user: user && { username: user.username, email: user.email, bio: user.bio, image: user.image },
        },
        errors: c.get('session').flash.errors ?? {},
      }
    },
    rootView: async (page) => {
      const { head, body } = await render(page)

      return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />${theme}
    <link rel="icon" href="/default-avatar.svg" />
    ${assets.head}
    ${head.join('\n    ')}
  </head>
  <body>
    ${body}
  </body>
</html>`
    },
  })
}
