import { dismissCookieConsent, waitForNuxtHydration } from './fixtures/cookie-consent.fixture'
import { expect, test } from '@playwright/test'
import { SEL } from './helpers/selectors'

test.beforeEach(async ({ context }) => {
  await context.clearCookies()
  await context.addInitScript(() => localStorage.clear())
})

// Brand name to assert in the page title. Defaults to Tokyo Sushi Bar; override
// via E2E_BRAND_NAME when running against another white-label brand.
const BRAND_NAME = process.env.E2E_BRAND_NAME || 'Tokyo Sushi'

test.describe('Public page smoke tests', () => {
  test('Homepage loads', async ({ page }) => {
    await page.goto('/fr/')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)
    await expect(page.locator('h1').first()).toBeVisible()
    await expect(page).toHaveTitle(new RegExp(BRAND_NAME, 'iu'))
  })

  test('Menu page loads with products', async ({ page }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)
    await expect(page.locator(SEL.productCard).first()).toBeVisible()
  })

  test('Cart page loads with empty state', async ({ page }) => {
    await page.goto('/fr/cart')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)
    await expect(page.locator(SEL.cartEmpty)).toBeVisible()
  })

  test('Contact page loads', async ({ page }) => {
    await page.goto('/fr/contact')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('FAQ page loads', async ({ page }) => {
    await page.goto('/fr/faq')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('Terms page loads', async ({ page }) => {
    await page.goto('/fr/terms')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)
    await expect(page.locator('h1').first()).toBeVisible()
  })
})
