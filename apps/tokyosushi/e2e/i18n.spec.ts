import {
  dismissCookieConsent,
  waitForNuxtHydration,
} from '../../../layers/engine/e2e/support/hydration'
import { expect, test } from '../../../layers/engine/e2e/support/test'
import { SEL } from '../../../layers/engine/e2e/support/selectors'

test.beforeEach(async ({ context }) => {
  await context.clearCookies()
  await context.addInitScript(() => {
    localStorage.clear()
  })
})

test.describe('Internationalization', () => {
  test('Root URL redirects to French locale', async ({ page }) => {
    await page.goto('/')
    // The i18n middleware may redirect before or during page load
    await page.waitForLoadState('domcontentloaded')
    expect(page.url()).toContain('/fr')
  })

  test('Direct English URL loads correctly', async ({ browser, baseURL }) => {
    // Need a fresh context with English locale — the default context uses fr-BE
    const context = await browser.newContext({
      baseURL,
      locale: 'en-US',
      extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
    })
    const page = await context.newPage()
    await page.goto('/en/menu')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)
    await expect(page.locator(SEL.productCard).first()).toBeVisible()
    expect(page.url()).toContain('/en/menu')
    await context.close()
  })

  test('Language picker switches locale', async ({ page }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)
    await page.locator(SEL.productCard).first().waitFor()

    // Two language pickers in DOM (mobile + desktop sidebar) — use nth(1) for desktop
    await page.locator(SEL.languagePicker).nth(1).click()

    // Select English from the dropdown
    await page.locator('[data-testid="language-option-en"]').click()

    // URL should now contain /en/
    await page.waitForURL('**/en/menu**')
    expect(page.url()).toContain('/en/menu')
  })
})
