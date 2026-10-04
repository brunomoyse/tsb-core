# Unit tests and coverage

Unit tests run with Vite+ (`vp test run`, vitest 5 inside). They cover the **TypeScript** of `layers/` and `apps/`
(composables, stores, plugins, middleware, server routes, utils, lib). `.vue` pages and components are covered by the
Playwright suites (`*/e2e`), not by the unit metric.

```bash
npm test                                          # all projects, ~5 s
npx vp test run layers/engine/stores              # one folder / file
npx vp test run -t "removes the line"             # by test title
npx vp test run --project unit                    # only the plain-node project (fastest, no Nuxt boot)
npm run test:coverage                             # coverage + thresholds (what CI runs); report in coverage/
```

`coverage/lcov-report/index.html` is the browsable report. The thresholds in `vite.config.ts`
(`test.coverage.thresholds`) only ever go up.

## Where tests go and how they are named

A test sits **next to the file it tests**. Its suffix picks the environment (the vitest "project"):

| Suffix                    | Project  | Environment                                         | For                                                        |
| ------------------------- | -------- | --------------------------------------------------- | ---------------------------------------------------------- |
| `*.test.mjs`, `*.test.ts` | `unit`   | plain Node, no Nuxt                                 | pure code: `utils/`, `lib/`, anything without auto-imports |
| `*.nuxt.test.ts`          | `nuxt`   | the real Nuxt app of `apps/tokyosushi` in happy-dom | composables, stores, plugins, route middleware             |
| `*.server.test.ts`        | `server` | Node + h3, Nitro's auto-imports as globals          | `server/routes`, `server/api`, `server/middleware`         |

Prefer the lightest project that works. A function that needs nothing from Nuxt belongs in `utils/` and gets a
`*.test.ts` (see the existing `*.test.mjs` next to the utils for the style: `node:assert/strict` or `expect`, both work).

Always `import { describe, expect, it, vi } from 'vite-plus/test'` (the lint rule `prefer-vite-plus-imports` enforces it).
Aliases `#engine` and `#brand` (tokyosushi) resolve in every project. Brand-specific behaviour of `ygfliege` is tested by
mocking `#brand/brand` (see `layers/engine/stores/cart.takeaway.nuxt.test.ts`).

Shared builders and helpers live in `test/` at the repo root:

- `test/fixtures/catalog.ts`: `makeProduct`, `makeChoice`, `makeCartItem`
- `test/fixtures/quote.ts`: `makeQuote`, `makeQuoteLine` (a `quoteOrder` answer)
- `test/fixtures/order.ts`: `makeOrder`, `makeOrderItem`, `makePayment`, `makeUser` (a placed order, as `myOrder` returns it)
- `test/flags.ts`: `setFlags({ server, client, dev })`, see "SSR-only and dev-only code"
- `test/helpers/`: `i18n.ts`, `gqlFetch.ts`, `withSetup.ts`, see "Composables that talk to the API"
- `test/nitro/callHandler.ts` and `test/nitro/imports.ts`: run a Nitro handler, set its runtime config
- `test/setup/*`: setup files of the projects (no network, flag reset)

Import them with a relative path (`'../../../test/fixtures/catalog'`) so that `nuxi typecheck` resolves them too.

## The `nuxt` project: composables, stores, plugins, middleware

`@nuxt/test-utils` boots the real app (layers, auto-imports, Pinia, i18n, runtime config) once per test file. Real is
the default: use the real stores, real `useState`, real i18n, real runtime config, and mock only the boundaries.

```ts
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, expect, it, vi } from 'vite-plus/test'
```

Pinia: give each test a fresh one. Without the persistence plugin unless the test is about persistence.

```ts
setActivePinia(createPinia())
const cart = useCartStore()
```

For persistence use the real plugin on an app: `pinia.use(createPersistedState()); createApp({}).use(pinia)` (see
`persistedStore()` in `layers/engine/stores/cart.nuxt.test.ts`). The store hydrates when it is created. Pinia ignores
mutations made in the same tick as a `$patch`, so `await nextTick()` before mutating and asserting on the written storage.

| Need                           | How                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime config                 | Real values come from the env defaults in `test/nuxtProject.ts` (`https://api.tokyosushi.test/...`). Change one for a test: `useRuntimeConfig().public.baseUrl = '...'` and restore it after (the object is mutable), or wrap the original: `mockNuxtImport('useRuntimeConfig', (original) => () => ({ ...original(), public: { ...original().public, x: 1 } }))`. Never replace it wholesale: the Nuxt app itself reads it while booting |
| `$fetch`                       | `const $fetchMock = vi.hoisted(() => vi.fn()); mockNuxtImport('$fetch', () => $fetchMock)`. Errors: throw `Object.assign(new Error(), { status: 401 })`                                                                                                                                                                                                                                                                                   |
| A relative API route           | `registerEndpoint('/api/thing', () => ({ ok: true }))` (works for `$fetch('/api/thing')` only, not for absolute URLs)                                                                                                                                                                                                                                                                                                                     |
| Route / navigation             | Pass a fake `to` to a middleware (`{ path, fullPath, meta }`). Mock navigation: `mockNuxtImport('navigateTo', () => navigateTo)`, or `vi.mock('nuxt/app', ...)` when the file imports it from `'nuxt/app'`                                                                                                                                                                                                                                |
| i18n                           | Real: `useNuxtApp().$i18n.locale.value = 'nl'`, `useLocalePath()`. Or hand a fake `{ $i18n: { locale: { value: 'nl' } } }` to a plugin function                                                                                                                                                                                                                                                                                           |
| Cookies                        | Write `document.cookie`, `useCookie` reads it                                                                                                                                                                                                                                                                                                                                                                                             |
| Time                           | `vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-04T12:00:00+02:00'))`, restore with `vi.useRealTimers()`. Never sleep                                                                                                                                                                                                                                                                                                             |
| `localStorage`, `window.umami` | happy-dom provides `localStorage`/`sessionStorage`; set `window.umami = { track: vi.fn() }` to see analytics events                                                                                                                                                                                                                                                                                                                       |
| OIDC (Zitadel), Sentry         | `vi.mock('#engine/composables/useOidc', () => ({ useOidc: () => oidcMock }))`, `vi.mock('#engine/utils/reportError', ...)`; `vi.hoisted` for the mock objects                                                                                                                                                                                                                                                                             |
| Another composable             | Use the real one when it is cheap. Mock with `mockNuxtImport('useThing', ...)` when it is a boundary                                                                                                                                                                                                                                                                                                                                      |

`vi.mock` / `mockNuxtImport` are hoisted: the values they use must come from `vi.hoisted(...)`. A module that is
mocked must be imported **after** the mocks: `const { default: plugin } = await import('./gqlFetch')`.

### Composables that talk to the API

The GraphQL transport (`$gqlFetch`, used by `useGqlMutation`, `useGqlQuery` and `useNuxtApp().$gqlFetch`) is a read-only
getter on the Nuxt app, so it is replaced by wrapping `useNuxtApp`; `vue-i18n`'s `useI18n` is replaced by a `t` that returns the
key and its params, so a test asserts WHICH message was chosen, not its wording; `withSetup` runs a composable inside a real
component (`onMounted`, `onScopeDispose`, `useId`...).

```ts
const gqlFetch = vi.hoisted(() => vi.fn())
mockNuxtImport('useNuxtApp', async (original) => {
  const { withGqlFetch } = await import('../../../test/helpers/gqlFetch')
  return () => withGqlFetch(original(), gqlFetch)
})
vi.mock('vue-i18n', async (importOriginal) => {
  const { fakeI18n } = await import('../../../test/helpers/i18n')
  return { ...(await importOriginal<typeof import('vue-i18n')>()), useI18n: fakeI18n }
})

const { result, unmount } = withSetup(() => useThing()) // from test/helpers/withSetup
```

A composable with module-level state (a shared request cycle, a "backend is old" flag) is loaded fresh per test:
`vi.resetModules()` then `await import(...)` of it and of the stores and error classes it shares `instanceof` with
(see `useOrderQuote.nuxt.test.ts`, `useCouponCode.nuxt.test.ts`). Fake timers: `vi.useFakeTimers({ toFake: [...] })`
with only the timers the code uses, and `await vi.advanceTimersByTimeAsync(ms)` to let promises settle.

### Plugins

A plugin file default-exports `defineNuxtPlugin(fn)`, which is the function itself: call it with a fake `nuxtApp` and
read what it returns (`{ provide: { gqlFetch } }`). The real app has also run it at boot; the test builds its own copy
with the mocks in place. See `layers/engine/plugins/gqlFetch.nuxt.test.ts`.

### Route middleware

`defineNuxtRouteMiddleware(fn)` is `fn`. Call it with a fake route, as in `layers/engine/middleware/auth.global.nuxt.test.ts`.

## The `server` project: Nitro handlers

Server code is compiled by Nitro, which auto-imports all of h3 and `useRuntimeConfig`. In this project h3's exports are
globals and `#imports` is a stand-in (`test/nitro/imports.ts`):

```ts
import { setRuntimeConfig } from '../../../../test/nitro/imports'
import { callHandler } from '../../../../test/nitro/callHandler'
import handler from './robots.txt'

setRuntimeConfig({ public: { baseUrl: 'https://tokyosushibarliege.be' } })
const response = await callHandler(handler, { path: '/robots.txt', headers: { ... }, method: 'POST', body: '...' })
expect(response.status).toBe(200)
expect(await response.text()).toContain('Sitemap:')
```

`callHandler` runs the handler through a real h3 app and returns a Web `Response`. A handler that imports
`nitropack/runtime` (`useStorage`, `defineCachedFunction`, `useNitroApp`) explicitly: mock that module with
`vi.mock('nitropack/runtime', () => ({ ... }))`. The runtime config is reset before every test.

## SSR-only and dev-only code

Nuxt replaces `import.meta.server`, `import.meta.client` and `import.meta.dev` with constants at build time, which makes
one side of every `if (import.meta.server)` unreachable. In the unit projects the sources of `layers/` and `apps/` are
rewritten so that each flag first reads a per-test override. Defaults: `nuxt` and `unit` are the browser (`client` true,
`server` false, `dev` false), `server` is Nitro (`server` true, `client` false, `dev` false).

```ts
import { setFlags } from '../../../test/flags'

it('does not touch localStorage during SSR', () => {
  setFlags({ server: true }) // also sets client: false; reset automatically after each test
  ...
})
```

Limits: only the sources of `layers/` and `apps/` are rewritten (not `node_modules`, so Nuxt itself keeps running as a
browser app); a flag read once at module load time (`const isServer = import.meta.server` at top level) is fixed at
import, so import the module after `setFlags` (`await import`) if a test needs it. Composables that call
`useRequestEvent()` on the server need `mockNuxtImport('useRequestEvent', ...)` to provide an event.

## The network is closed

`test/setup/noNetwork.ts` makes any `fetch`/`$fetch` to a host other than localhost fail with
`Unmocked network request blocked in unit tests`. A test that reaches Mollie, Zitadel, the API or S3 is wrong: mock the
boundary.

## Writing good tests (the review bar)

- Assert behaviour: return values, state, calls made with the right arguments, errors surfaced. A test that only calls a
  function to light up lines is rejected.
- Critical flows (order, auth, payment) cover every branch, error paths included.
- Deterministic and fast: no real network, no sleeps, no dependence on test order or on the current date.
- Don't change production behaviour for testability. A branch that cannot be reached is dead code: report it instead of
  adding an ignore comment.
