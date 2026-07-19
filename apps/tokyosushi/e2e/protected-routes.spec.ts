import { expect, test } from '@playwright/test'

test.beforeEach(async ({ context }) => {
  await context.clearCookies()
  await context.addInitScript(() => localStorage.clear())
})

test.describe('Protected route redirects', () => {
  /*
   * /checkout intentionally has `definePageMeta({ public: true })` to support
   * guest checkout — there is no auth gate to test. The cases below cover the
   * routes that actually opt into auth via `public: false`.
   */
  test('/me redirects away without auth', async ({ page }) => {
    await page.goto('/fr/me')
    await expect(() => {
      expect(page.url()).not.toContain('/me')
    }).toPass({ timeout: 15_000 })
  })

  test('/me/orders also redirects away without auth', async ({ page }) => {
    await page.goto('/fr/me/orders')
    await expect(() => {
      expect(page.url()).not.toContain('/me/orders')
    }).toPass({ timeout: 15_000 })
  })
})
