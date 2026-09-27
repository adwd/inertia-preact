# inertia-preact

A [Preact](https://preactjs.com) adapter for [Inertia.js](https://inertiajs.com) 3.

See [packages/preact/README.md](packages/preact/README.md) for installation and usage, and [examples/conduit](examples/conduit) for an example app.

## Repository

| Path | |
| --- | --- |
| `packages/preact` | The adapter (package `@adwd/inertia-preact`) |
| `examples/conduit` | [RealWorld](https://github.com/realworld-apps/realworld)'s Conduit with Hono, Inertia and Preact: a complete example app |
| `test-app` | Pages for the end-to-end tests, written in Preact |
| `scripts/e2e.mjs` | Runs the official Inertia end-to-end suite against the adapter |
| `docs/PLAN.md` | Development plan, progress and decisions (in Japanese) |

## Development

```bash
pnpm install
pnpm build          # the adapter
pnpm test           # unit tests
pnpm type-check     # the adapter and the test app
pnpm lint
pnpm format
pnpm test:e2e       # the official end-to-end suite (Chromium)
pnpm test:e2e:ssr   # its server-side rendering tests
```

`scripts/e2e.mjs` checks the Inertia repository out at a pinned commit in `e2e/inertia`, replaces its React adapter and test app with this adapter and `test-app`, and runs the suite with Playwright. Tests of React-only features are listed in `NOT_APPLICABLE` there. Options:

| | |
| --- | --- |
| `--ssr` | The server-side rendering tests |
| `--firefox`, `--webkit` | Another browser (Chromium by default) |
| `--debug` | Enables `preact/debug` in the test app and reports its warnings and errors |
| `--skip-install` | Skips `pnpm install` in the checkout |
| `VITE_HTTP_CLIENT=axios` | Uses the axios HTTP client |
| `PREACT_VERSION=11.0.0-rc.2` | Uses another Preact version |
| `VITE_PREACT_COMPAT=true` | Loads `preact/compat` in the test app, like an app using it |

Other arguments are passed to Playwright, e.g. `pnpm test:e2e tests/links.spec.ts --repeat-each=3`.

## Releasing

Bump the version in `packages/preact/package.json`, commit, and push a tag named after it:

```bash
git tag v0.1.0 && git push origin v0.1.0
```

The Publish workflow (`.github/workflows/publish.yml`) then builds, tests and publishes the package to GitHub Packages.

## License

MIT
