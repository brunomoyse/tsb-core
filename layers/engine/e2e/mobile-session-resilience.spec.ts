import { type Page } from '@playwright/test'
import { expect, test } from './support/test'
import { waitForNuxtHydration } from './support/hydration'

/*
 * The signed-in session when the app starts on a phone, both brands: after the first paint the app re-reads the profile
 * (`AuthSyncMe`, plugins/auth-sync.client.ts) and stores it. Found while chasing a flaky checkout spec: a navigation that
 * lands while that request is in flight aborts it, and the app then drops the OIDC session.
 */

test.skip(({ mock }) => !mock, 'needs the mock tsb-service (fake session, profile)')
test.skip(({ isMobile }) => !isMobile, 'phone layout')

const hasSession = (page: Page) =>
  page.evaluate(() => Object.keys(localStorage).some((key) => key.startsWith('oidc.user:')))
const hasProfile = (page: Page) =>
  page.evaluate(() => {
    try {
      return Boolean((JSON.parse(localStorage.getItem('auth') ?? '{}') as { user?: unknown }).user)
    } catch {
      return false
    }
  })

const isProfileSync = (postData: string | null) => (postData ?? '').includes('AuthSyncMe')

test.describe('Profile sync at app start', () => {
  test('a signed-in visitor gets the profile stored and keeps the session', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await expect.poll(() => hasProfile(page)).toBe(true)
    expect(await hasSession(page)).toBe(true)
  })

  // BUG (found by this spec): the sync treats ANY failure of its /me request as "the token is stale" and removes the
  // OIDC session: a request cut by a navigation, a dropped connection or a 5xx signs the customer out, who then meets
  // The login step in the middle of an order. Only a refusal of the token itself (401 / UNAUTHENTICATED) should do that.
  // The assertion below fails today.
  test.fail(
    'a network failure of the profile request does not sign the customer out',
    async ({ authenticatedPage: page }) => {
      await page.route('**/api/v1/graphql', async (route) => {
        if (isProfileSync(route.request().postData())) await route.abort('connectionreset')
        else await route.continue()
      })
      const failed = page.waitForEvent('requestfailed', (request) =>
        isProfileSync(request.postData()),
      )
      await page.goto('/fr/menu')
      await failed
      await page.waitForLoadState('networkidle')
      expect(await hasSession(page), 'the OIDC session was removed after a failed request').toBe(
        true,
      )
    },
  )
})
