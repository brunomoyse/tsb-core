/*
 * OTP login helper used by globalSetup. The runtime auth fixture doesn't go
 * through the UI — it injects OIDC localStorage entries captured here.
 *
 * Why one round-trip per test session: oidc-client-ts persists the access
 * token, refresh token, and PKCE state in localStorage; capturing them once
 * gives every downstream test a valid session without the email-poll latency.
 */

import type { Page } from '@playwright/test'
import { waitForOtpFromZitadel } from './zitadel-otp'

export interface CapturedOidcState {
    /* Each entry is a key/value pair from localStorage matching `oidc.*`. */
    entries: [string, string][]
}

/*
 * Drive the full email → OTP → /menu flow once, returning the captured
 * oidc-client-ts localStorage entries so they can be replayed by the
 * per-test fixture.
 */
export async function loginViaOtpAndCaptureState(
    page: Page,
    baseURL: string,
    email: string,
): Promise<CapturedOidcState> {
    /*
     * Capture the cutoff before triggering the OTP so the event-store poll
     * ignores any code emitted before this run. (Codes live 5min in Zitadel.)
     */
    const before = new Date()

    await page.goto(`${baseURL}/fr/auth/login`)

    /*
     * The login page is `public: true` but it bounces through Zitadel to
     * obtain an authRequestID, then returns with `?authRequest=...` in the
     * URL. Wait for that round-trip to finish so the email form is wired up.
     */
    await page.waitForURL((url) => url.searchParams.has('authRequest') || url.searchParams.has('authRequestID'), {
        timeout: 30_000,
    })
    await page.locator('#auth-email').waitFor({ state: 'visible', timeout: 10_000 })
    /*
     * The form is `@submit.prevent="onSubmitEmail"` but if Playwright clicks
     * before Vue has hydrated, the browser does a native GET to the same URL
     * with the email as a query param, which our login page then treats as a
     * stale authRequest and bounces back to Zitadel. Wait for network idle so
     * Nuxt's hydration tasks finish before we submit.
     */
    await page.waitForLoadState('networkidle')
    await page.locator('#auth-email').fill(email)
    await page.locator('[data-testid="login-submit"]').click()

    /* OTP input only appears after the backend confirms the code was sent. */
    await page.locator('#auth-code').waitFor({ state: 'visible', timeout: 15_000 })

    const code = await waitForOtpFromZitadel(email, { after: before, timeoutMs: 20_000 })

    await page.locator('#auth-code').fill(code)
    await page.locator('[data-testid="login-verify"]').click()

    /*
     * After verify: createSession → OIDC callback → token exchange → /menu.
     * Wait for the final landing page rather than any intermediate redirect.
     */
    await page.waitForURL(/\/fr\/menu(?:\/?$|\?)/u, { timeout: 30_000 })
    /*
     * Menu page kicks off a flurry of GraphQL calls + token-refresh tasks on
     * mount; let those settle so page.evaluate() doesn't race a navigation.
     */
    await page.waitForLoadState('networkidle')

    const entries = await page.evaluate(() => {
        const out: [string, string][] = []
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (!key) continue
            if (key.startsWith('oidc.')) {
                const value = localStorage.getItem(key)
                if (value !== null) out.push([key, value])
            }
        }
        return out
    })

    if (entries.length === 0) {
        throw new Error('OTP login succeeded but no oidc.* localStorage entries were found')
    }
    return { entries }
}
