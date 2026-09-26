import type { Plugin } from 'vite'

const id = 'virtual:test-tools'

/**
 * Provides `virtual:test-tools`, imported first by the app entries. Depending on the environment it loads
 * tools that change how the whole app runs, which is why they are selected when building:
 *
 * - VITE_PREACT_DEBUG: preact/debug (see debug.ts)
 * - VITE_PREACT_COMPAT: preact/compat, which patches Preact to emulate React, like in apps that use it
 */
export default function testTools(): Plugin {
  return {
    name: 'test-tools',
    resolveId: (source) => (source === id ? `\0${id}` : null),
    load: (resolved) => {
      if (resolved !== `\0${id}`) {
        return null
      }

      return [
        process.env.VITE_PREACT_DEBUG && `import '${__dirname}/debug.ts'`,
        process.env.VITE_PREACT_COMPAT && `import 'preact/compat'`,
      ]
        .filter(Boolean)
        .join('\n')
    },
  }
}
