# Mock mode for the Playwright suites

The e2e specs can run against an in-repo mock of tsb-service instead of the real test server: no secret, no database
tunnel, no Zitadel. CI runs this ("E2E (mock)", one job per brand and per half: `test:e2e:mock:desktop` /
`test:e2e:mock:mobile`, because a whole brand takes ~20 min on its single worker); the real-backend mode (`apps/<brand>/playwright.config.ts`) is unchanged
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
| `zitadel.ts`                  | Fake Zitadel: discovery, authorize (-> the app's own login page with an `authRequest`), token endpoint (code exchange and refresh grant), end_session.                                                 |
| `auth.ts`                     | The REST side of tsb-service (`/api/v1/...`): `/auth/session/otp/*`, `/auth/finalize`, `/auth/authorize-proxy`, the invoice PDF, the contact form's `/feedback`.                                       |
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
- Phone-layout specs: name the file `mobile-*.spec.ts` (it runs on the `engine-mobile` project only; in a brand's own
  `apps/<brand>/e2e` it runs on `brand-mobile`), or add it to that project's `testMatch`. The desktop projects skip `mobile-*`.
  Narrower or wider phones: `test.use({ viewport })` or `page.setViewportSize` (the layout guard does 320 / 360 / 390 / 430).
- New spec projects/viewports: edit `playwright.ts` once, it applies to both brands.

## Reusable checks (`../support/`)

| Helper                                                         | What it asserts                                                                                                                                                                          |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layout.ts` `measureLayout(page)` / `expectMobileLayout(page)` | on the current page and viewport: nothing sticks out sideways (a horizontal scroller may), no two controls cover each other, no control under 44 px (icon buttons 44 x 44, text 44 tall) |
| `i18n.ts` `expectNoUntranslatedText(page, brand)`              | no raw key (`checkout.foo`), unfilled `{template}`, `undefined` / `NaN` in the text or the placeholder / aria-label / title / alt attributes                                             |
| `i18n.ts` `message(brand, locale, 'login.title')`              | the apps' own message (engine + brand overrides, `__BRAND__` filled): assert the right language is on screen without hard-coding copy                                                    |
| `locale.ts` `chooseLocale(context, baseURL, 'nl')`             | the visitor has picked that language (cookie + header); without it a French browser opening `/nl/...` is redirected to `/fr/...` (`redirectOn: 'all'`)                                   |
| `nav.ts`, `login.ts`, `account.ts`                             | phone menu, language picker, category chips, login steps, account dialogs                                                                                                                |

## Controlling the mock (`backend.mock`, a `MockControl`)

| Call                                                                                                                 | Effect                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `restaurant('open' \| 'scheduled-only' \| 'closed' \| 'disabled')`                                                   | restaurant config; pushed live to open pages (`restaurantConfigUpdated`)                                                                                                                                                                                          |
| `scenario({ quoteDelayMs, quoteFailure, createOrderFailure, createOrderDelayMs, latencyMs, mollie, rejectSession })` | failures and delays; `mollie`: `ask` (buttons) / `paid` / `failed` / `canceled` / `expired` / `open` (return before the webhook)                                                                                                                                  |
| `scenario({ otp: { code, newAccount, requestFailure, codeExpired, resendFailure, verifyFailure } })`                 | the sign-in endpoints: the accepted code (default `123456`), a new account (asks for a name), a refused address / throttle / outage, an expired code                                                                                                              |
| `failOperation(op, { code, message?, productId? } \| null)`                                                          | any root query or mutation of the app (`updateMe`, `validateCoupon`, `restaurantConfig`, `myOrders`...) answers a GraphQL error with that `extensions.code`; `null` repairs it: load errors, failed saves. For what has no dedicated scenario                     |
| `scenario({ invoiceFailure, feedbackFailure })`                                                                      | the invoice download answers 500; the contact form is refused (`invalid` / `captcha_failed` / `rate_limited` / `server`)                                                                                                                                          |
| `coupon('CODE', { kind, value, minOrder?, refusal? })`                                                               | promo codes (defaults: WELCOME10, FIVEOFF, EXPIRED, BIGSPENDER); unknown codes are COUPON_INVALID                                                                                                                                                                 |
| `user({ phoneNumber, firstName, address: 'place-home' \| null, ... })`                                               | profile; places: `place-home` 1,8 km, `place-mid` 3,5 km, `place-far` 8,2 km, `place-out` 12 km (out of zone), `place-excluded` (postcode 4610)                                                                                                                   |
| `seedOrder({ status, online, paymentStatus, withItem, productId, items, type, createdMinutesAgo })`                  | an order in a given state (what the webhook would have left) -> id. `productId` (mock only) = the product of the `withItem` line. `items` (mock only) = exact lines `{ productId, quantity, selections }` priced from the catalog, for re-order and receipt specs |
| `settleOrder(id, status, paymentStatus)` / `patchOrder(id, {...})`                                                   | changes it and pushes `myOrderUpdated` to the page over the WebSocket                                                                                                                                                                                             |
| `product(id, { price, isAvailable })`                                                                                | catalog change, pushed as `productUpdated`                                                                                                                                                                                                                        |
| `operations(op?)`, `restCalls(prefix?)`, `createdOrders()`, `state()`, `waitFor(pred)`                               | what the app did: GraphQL calls with their arguments, REST calls (`/auth/...`, `/orders/:id/invoice`, `/feedback`, the token grants at `/zitadel/oauth/v2/token`), the `createOrder` inputs                                                                       |

The default is: restaurant open, user signed in as "Eva Mock" with no phone and no saved address, no orders, no failures.
Online payment: `createOrder` returns `payment.links.checkout.href` = the fake Mollie page; click `mollie-paid` /
`mollie-failed` / ... (`getByTestId`) or set `scenario({ mollie: 'paid' })` and the app comes straight back.

## Signing in for real (the OTP flow)

`authenticatedPage` skips the login UI with a faked session. A spec about the login itself drives the real round trip, which
the mock serves end to end: `/fr/auth/login` -> `GET /zitadel/oauth/v2/authorize` (stores the request, redirects to the app's login
page with `?authRequest=<id>`) -> `POST /auth/session/otp/request|verify|resend|complete-profile` -> `POST /auth/finalize` (answers the
app's `/auth/callback?code=&state=`) -> `POST /zitadel/oauth/v2/token` (an unsigned id_token and a refresh token) -> the app is signed
in. `support/login.ts` has the steps (`openLogin`, `requestCode`, `submitCode`, `loginWithCode`) and `seedSession` for a session of a
chosen age (an expired access token is renewed with the refresh grant; `scenario({ rejectSession: true })` makes that grant, the API
and the invoice answer "unauthenticated", i.e. a session the server no longer honours). The resend countdown is a real 20 s timer:
use `page.clock.install()` and `page.clock.runFor(21_000)` instead of waiting.

## Helpers for order journeys (`../support/order-flow.ts`)

Layout-aware building blocks used by the `mobile-*.spec.ts` and `checkout-desktop.spec.ts` journeys: `fillCart` / `addPlain`
(from the menu cards), `openProductModal` + `pickChoice`, `openCart` (side cart on a desktop, floating bar + sheet on a
phone), `gotoCheckout`, `chooseCollection`, `choosePayment`, `pickDeliveryAddress`, `payButton` / `payAmount` (the phone's bar
or the desktop button; the amount comes from the summary on desktop), `summaryRow`, `waitForQuote`, `cartLines` (the
persisted cart), `noHorizontalScroll` / `inViewport` / `expectNoOverlap` (layout checks). Things worth knowing when writing
one more:

- The address field only searches once the text has a digit (a house number): query `'Blonden 33'`, not `'Blonden'`.
- A push (`settleOrder`, `patchOrder`, `restaurant()`) reaches a page only once it has subscribed: wait with
  `backend.mock.waitFor((s) => s.subscriptions.includes('myOrderUpdated:<id>'))` (or `'restaurantConfigUpdated'`).
- The fake Mollie page lives on the mock's origin, so the app's localStorage (the cart) cannot be read while it is open.
- Tokyo Sushi starts on **delivery**: its 25,00 minimum and missing address block the pay button, so a spec that is not
  about delivery picks pickup first (`chooseCollection(page, 'pickup')`). YGF is pickup-only.
- Playwright cannot serialise a regexp that contains an apostrophe into a role/text selector: write `/Modifier l.adresse/`.

## Keeping the mock in step with the app

When the app asks for a field or an operation the mock lacks, the answer is `null` / a validation error and the test
fails with "the app used API the mock does not implement" (the mock logs `[mock] GAP ...`; `backend.mock.state().gaps`).
Add the field to the object returned by the resolver (`resolvers.ts`, `state.ts`, `catalog/`), or the resolver itself.

## Limits (for now)

- One mock state per brand, so `workers: 1`; every test starts from `reset()`.
- Google / Apple sign-in (`/auth/idp/*`) is not mocked; the buttons are only checked for being there.
- One user: the mock's `me` is always `state.user` whatever address signed in (a new account takes the address typed and starts
  without a name until `complete-profile`).
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
