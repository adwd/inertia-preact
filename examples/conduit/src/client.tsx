import { createInertiaApp } from '@adwd/inertia-preact'
import { layout, resolve, title } from './app.ts'

createInertiaApp({ resolve, title, layout, progress: { color: '#5cb85c' } })
