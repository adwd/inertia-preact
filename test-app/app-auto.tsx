import 'virtual:test-tools'
import { createInertiaApp, router } from 'inertia-preact'

window.testing = { Inertia: router }

// This uses the pages shorthand - the Vite plugin transforms this to a full resolve function
// Using './VitePages' instead of './Pages' to prove the transform uses our configured path
createInertiaApp({
  pages: './VitePages',
})
