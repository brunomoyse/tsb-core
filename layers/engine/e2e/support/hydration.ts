import type { Page } from '@playwright/test'

/*
 * Wait for Nuxt 4 to finish mounting. The old probe (`app.$nuxt?.isHydrating`)
 * was a Nuxt 2 internal that doesn't exist in Nuxt 4 — it always resolved
 * truthy as soon as #__nuxt had a Vue app, *unless* the page was still
 * about:blank, in which case it polled forever.
 *
 * The replacement is a hands-off check: just confirm #__nuxt has children
 * (Vue mounted into it). If the page is about:blank or stuck on an early
 * redirect the inner timeout fires fast with a useful error rather than
 * silently consuming the whole test timeout.
 */
export async function waitForNuxtHydration(page: Page) {
  await page.waitForLoadState('domcontentloaded')
  await page.waitForFunction(
    () => {
      const root = document.querySelector('#__nuxt') as HTMLElement | null
      return Boolean(root) && (root?.childElementCount ?? 0) > 0
    },
    { timeout: 15_000 },
  )
  /*
   * After Vue is mounted, wait for the menu's data fetches / cart store
   * bootstrap to settle. Otherwise click handlers may not be attached yet
   * (forms submit natively, click handlers no-op). networkidle ignores
   * WebSocket subscriptions, so live restaurant-config doesn't block it.
   */
  await page.waitForLoadState('networkidle')
  /*
   * Nuxt devtools renders an iframe overlay (#nuxt-devtools-container) in
   * dev mode. On mobile viewports its floating panel sits over the
   * FloatingCartBar / other interactive elements and intercepts clicks.
   * Hide it for the duration of the test — has no effect in prod (the
   * element doesn't exist) or if devtools is already disabled.
   */
  await page
    .addStyleTag({
      content: '#nuxt-devtools-container, nuxt-devtools-frame { display: none !important; }',
    })
    .catch(() => undefined)
}

// No-op: cookie consent banner was removed (Umami analytics doesn't use cookies)
export async function dismissCookieConsent(_page: Page) {}

/*
 * Vue logs "Hydration completed but contains mismatches" (a console error, also in a production build) when the DOM the
 * server sent differs from what the client rendered: a flash of different content and, sometimes, a lost event handler.
 * Call this before navigating; the returned function lists the page and the message of every occurrence so far.
 */
export function watchHydrationMismatches(page: Page): () => string[] {
  const found: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && /hydration/iu.test(message.text()))
      found.push(`${page.url()}: ${message.text()}`)
  })
  return () => [...found]
}

/*
 * Like waitForNuxtHydration, for a spec that walks many pages (a sweep): Vue has mounted and the network went quiet, but a
 * page that keeps a request or a socket busy (polling, live updates) must not stall the whole walk, so the idle wait is
 * best effort and bounded.
 */
export async function settleNuxt(page: Page, idleTimeout = 5_000) {
  await page.waitForLoadState('domcontentloaded')
  await page.waitForFunction(
    () => (document.querySelector('#__nuxt')?.childElementCount ?? 0) > 0,
    undefined,
    { timeout: 15_000 },
  )
  await page.waitForLoadState('networkidle', { timeout: idleTimeout }).catch(() => undefined)
}
