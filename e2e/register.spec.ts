import { dismissCookieConsent, waitForNuxtHydration } from './fixtures/cookie-consent.fixture'
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ context }) => {
  await context.clearCookies()
  await context.addInitScript(() => localStorage.clear())
})

test.describe('Registration form', () => {
  test('Form renders all expected fields', async ({ page }) => {
    await page.goto('/fr/auth/register')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)

    await expect(page.locator('h1').first()).toBeVisible()
    await expect(page.locator('#firstName')).toBeVisible()
    await expect(page.locator('#lastName')).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
  })

  test('Password strength indicators appear when typing', async ({ page }) => {
    await page.goto('/fr/auth/register')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)

    // Wait for Vue hydration
    await page.waitForFunction(() => Boolean(document.querySelector('#__nuxt')?.__vue_app__))

    // Type password character by character to trigger Vue v-model reactivity
    const pwField = page.locator('#password')
    await pwField.click()
    await page.keyboard.type('abc', { delay: 50 })

    // Password requirements list should appear (5 items)
    const requirements = page.locator('form ul li')
    await expect(requirements.first()).toBeVisible({ timeout: 5_000 })
    await expect(requirements).toHaveCount(5)
  })

  test('Strong password meets all requirements', async ({ page }) => {
    await page.goto('/fr/auth/register')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)

    await page.waitForFunction(() => Boolean(document.querySelector('#__nuxt')?.__vue_app__))

    const pwField = page.locator('#password')
    await pwField.click()
    await page.keyboard.type('MyStr0ng!Pass', { delay: 50 })

    // All 5 requirements should show ✓ (green checkmarks)
    const metItems = page.locator('form ul li:has-text("✓")')
    await expect(metItems).toHaveCount(5)
  })
})
