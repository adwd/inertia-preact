// preact/debug warns about misuse, such as invalid hook calls, updates of unmounted components or duplicate
// keys. Its warnings and errors are repeated with a marker, for the E2E harness (`--debug`) to collect them
// from the browser's log output.
import 'preact/debug'

for (const level of ['warn', 'error'] as const) {
  const original = console[level]

  console[level] = (...args: unknown[]) => {
    const message = args.map((arg) => (arg instanceof Error ? arg.stack : String(arg))).join(' ')
    console.info(`[preact-debug] ${level} ${location.pathname} ${encodeURIComponent(message)}`)
    original(...args)
  }
}
