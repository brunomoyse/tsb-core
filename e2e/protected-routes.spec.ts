import { expect, test } from '@playwright/test'

test.beforeEach(async ({ context }) => {
  await context.clearCookies()
  await context.addInitScript(() => localStorage.clear())
})

test.describe('Protected route redirects', () => {
  test('/checkout redirects away without auth', async ({ page }) => {
    await page.goto('/fr/checkout')
    // Auth middleware calls signIn() which redirects to Zitadel's /oauth/v2/authorize
    // Wait for the URL to no longer be /checkout
    await expect(async () => {
      expect(page.url()).not.toContain('/checkout')
    }).toPass({ timeout: 15_000 })
  })

  test('/me redirects away without auth', async ({ page }) => {
    await page.goto('/fr/me')
    await expect(async () => {
      expect(page.url()).not.toContain('/me')
    }).toPass({ timeout: 15_000 })
  })
})
