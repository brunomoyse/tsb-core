# Mock mode for the Playwright suites

The e2e specs can run against an in-repo mock of tsb-service instead of the real test server: no secret, no database
tunnel, no Zitadel. CI runs this ("E2E (mock)"); the real-backend mode (`apps/<brand>/playwright.config.ts`) is unchanged
and still used by hand.

```bash
export PATH=<npm 12>/bin:$PATH
npm run test:e2e:mock -w tokyosushi          # or ygfliege; builds the app, starts mock + app, runs the specs
E2E_SKIP_BUILD=1 npm run test:e2e:mock -w tokyosushi -- --project=engine-desktop -g "coupon"   # reuse the last build
E2E_REUSE=1 ...                               # reuse a mock/app already listening (ports below)
```

Ports: tokyosushi app 3200 + mock 8100, ygfliege app 3201 + mock 8101. The build (`nuxt build`, ~15 s) overwrites
`apps/<brand>/.output` and `.nuxt`: do not run it next to a dev server of the same app.

## Pieces

| File                          | What                                                                                                                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `playwright.ts`               | `mockPlaywrightConfig()`: projects, `webServer`s (mock + production build of the app), env baked into the build (every URL points at the mock). Used by `apps/<brand>/playwright.mock.config.ts`.      |
| `server.ts`, `http.ts`        | The mock process (Node runs the TypeScript directly): GraphQL over HTTP, graphql-transport-ws, control API, fake Mollie, fake Zitadel, fake images. One brand per process (`MOCK_BRAND`, `MOCK_PORT`). |
| `resolvers.ts`                | One resolver per root query/mutation/subscription the apps use.                                                                                                                                        |
| `graphql.ts`                  | Tiny executor: no schema, the selection set is projected onto what the resolver returns. A field the object lacks is a **gap**.                                                                        |
| `pricing.ts`, `restaurant.ts` | `quoteOrder`/`createOrder` maths (pickup discount, delivery fee by distance, coupon, online fee, rounding), ordering policy, restaurant config per mode, delivery places.                              |
| `catalog/`                    | Seed menus per brand (long names, required/multi-select choice groups, unavailable item, paid extras).                                                                                                 |
| `state.ts`                    | All mutable state + `reset()` + pub/sub that feeds the WebSocket subscriptions.                                                                                                                        |
| `mollie.ts`                   | Fake hosted checkout: `/mollie/checkout/<orderId>` then back to `<app>/<locale>/order-completed/<id>`.                                                                                                 |
| `zitadel.ts`                  | Discovery + authorize (-> the app's own login page) + end_session. No token endpoint yet.                                                                                                              |
| `control.ts`, `client.ts`     | Control API (`/__mock/*`) and its typed test-side client `MockControl`.                                                                                                                                |
| `oidc.ts`                     | The fake oidc-client-ts session seeded in localStorage.                                                                                                                                                |
| `../support/backend.ts`       | `backend` fixture: the same calls against the mock or, in real mode, the test DB.                                                                                                                      |
| `../support/test.ts`          | Shared `test`: `backend`, `authenticatedPage` (fake session in mock mode), and an auto fixture that resets the mock before each test, blocks non-localhost requests and fails the test on mock gaps.   |

## Writing a spec

Import `test`/`expect` from `./support/test` (never from `@playwright/test`: the lifecycle fixture lives there). Put
shared specs in `layers/engine/e2e/`, brand specs in `apps/<brand>/e2e/`.

```ts
import { expect, test } from './support/test'

test('a closed restaurant blocks the pay button', async ({ authenticatedPage: page, backend }) => {
  test.skip(!backend.isMock, 'needs the mock') // anything beyond seed/settle/delete is mock-only
  await backend.mock.restaurant('closed')
  ...
})
```

- `page` = anonymous visitor (no token: `me`, orders, `createOrder` answer UNAUTHENTICATED, as the real API does).
  `authenticatedPage` = signed in (fake session + the bearer token the mock accepts).
- Runs in both modes: only `backend.seedOrder / settleOrder / deleteOrder`. Anything else goes through `backend.mock`.
- Specs that never need the backend beyond the app (menu, cart, forms) need nothing special.
- A spec that cannot run on the mock (needs Zitadel, pixel baselines): add it to `REAL_BACKEND_ONLY` in `playwright.ts`.
- Phone-layout specs: name the file `mobile-*.spec.ts` (it runs on the `engine-mobile` project only), or add it to
  that project's `testMatch`. The desktop projects skip `mobile-*`.
- New spec projects/viewports: edit `playwright.ts` once, it applies to both brands.

## Controlling the mock (`backend.mock`, a `MockControl`)

| Call                                                                                                                 | Effect                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `restaurant('open' \| 'scheduled-only' \| 'closed' \| 'disabled')`                                                   | restaurant config; pushed live to open pages (`restaurantConfigUpdated`)                                                                        |
| `scenario({ quoteDelayMs, quoteFailure, createOrderFailure, createOrderDelayMs, latencyMs, mollie, rejectSession })` | failures and delays; `mollie`: `ask` (buttons) / `paid` / `failed` / `canceled` / `expired` / `open` (return before the webhook)                |
| `coupon('CODE', { kind, value, minOrder?, refusal? })`                                                               | promo codes (defaults: WELCOME10, FIVEOFF, EXPIRED, BIGSPENDER); unknown codes are COUPON_INVALID                                               |
| `user({ phoneNumber, firstName, address: 'place-home' \| null, ... })`                                               | profile; places: `place-home` 1,8 km, `place-mid` 3,5 km, `place-far` 8,2 km, `place-out` 12 km (out of zone), `place-excluded` (postcode 4610) |
| `seedOrder({ status, online, paymentStatus, withItem, createdMinutesAgo })`                                          | an order in a given state (what the webhook would have left) -> id                                                                              |
| `settleOrder(id, status, paymentStatus)` / `patchOrder(id, {...})`                                                   | changes it and pushes `myOrderUpdated` to the page over the WebSocket                                                                           |
| `product(id, { price, isAvailable })`                                                                                | catalog change, pushed as `productUpdated`                                                                                                      |
| `operations(op?)`, `createdOrders()`, `state()`, `waitFor(pred)`                                                     | what the app did: GraphQL calls with their arguments, the `createOrder` inputs                                                                  |

The default is: restaurant open, user signed in as "Eva Mock" with no phone and no saved address, no orders, no failures.
Online payment: `createOrder` returns `payment.links.checkout.href` = the fake Mollie page; click `mollie-paid` /
`mollie-failed` / ... (`getByTestId`) or set `scenario({ mollie: 'paid' })` and the app comes straight back.

## Keeping the mock in step with the app

When the app asks for a field or an operation the mock lacks, the answer is `null` / a validation error and the test
fails with "the app used API the mock does not implement" (the mock logs `[mock] GAP ...`; `backend.mock.state().gaps`).
Add the field to the object returned by the resolver (`resolvers.ts`, `state.ts`, `catalog/`), or the resolver itself.

## Limits (for now)

- One mock state per brand, so `workers: 1`; every test starts from `reset()`.
- The OTP login UI cannot complete: `zitadel.ts` has no token endpoint and the `/auth/session/otp/*` REST calls of
  tsb-service are not mocked. Authenticated specs use the fake session instead.
- Responses are French only (the mock ignores `Accept-Language`).
- A failing test gets a `browser-problems` attachment (page errors, console errors, failed requests) and, locally, a trace.

## Flaky on a machine that creates network interfaces

Chromium aborts in-flight requests with `net::ERR_NETWORK_CHANGED` whenever the host's network interfaces change, even
for localhost. On a host where Docker creates/removes veth devices all the time (parallel `dockertest` runs), that
surfaces as random "element not found" / "Failed to fetch dynamically imported module" failures (the attachment shows
it). CI is not affected. Locally, run the suite in its own network namespace, which sees no host interface events
(the build needs the internet for fonts: do one normal run first):

```bash
# once, normally (it builds apps/<brand>/.output), then:
cd apps/tokyosushi
E2E_SKIP_BUILD=1 unshare -rn bash -c 'ip link set lo up && exec npx playwright test -c playwright.mock.config.ts'
```
