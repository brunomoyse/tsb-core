import type { Page } from '@playwright/test'

/*
 * Collects what the browser reports as broken while a spec runs: uncaught page errors, console errors, failed requests
 * and 4xx/5xx responses. A spec asserts `problems()` is empty at its end, so a regression that only shows in the
 * console (a failed query, a hydration mismatch) fails the run instead of passing silently.
 */
const EXTERNAL =
  /umami|nuagemagique|challenges\.cloudflare|openstreetmap|googleapis|gstatic|sentry/iu
/** Resource load failures of the browser itself, not of the app. */
const BROWSER_NOISE = /ERR_NETWORK_CHANGED/u

export function collectBrowserProblems(page: Page): () => string[] {
  const found: string[] = []
  page.on('pageerror', (error) => found.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const text = message.text()
    if (
      BROWSER_NOISE.test(text) ||
      EXTERNAL.test(text) ||
      EXTERNAL.test(message.location().url ?? '')
    )
      return
    found.push(`console.error: ${text.slice(0, 300)}`)
  })
  page.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText ?? ''
    if (EXTERNAL.test(request.url()) || BROWSER_NOISE.test(reason)) return
    // A navigation the page cancelled by navigating again is not a failure.
    if (/ERR_ABORTED/u.test(reason)) return
    found.push(`requestfailed: ${request.url().slice(0, 140)} ${reason}`)
  })
  page.on('response', (response) => {
    if (response.status() >= 400 && !EXTERNAL.test(response.url())) {
      found.push(`http ${response.status()}: ${response.url().slice(0, 140)}`)
    }
  })
  return () => found
}
