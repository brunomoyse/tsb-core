import type { Page } from '@playwright/test'

/** Wait for Nuxt to finish hydrating all components. */
export async function waitForNuxtHydration(page: Page) {
  await page.waitForFunction(() => {
    const app = document.querySelector('#__nuxt')?.__vue_app__
    return app && !app.$nuxt?.isHydrating
  }, { timeout: 15_000 })
}

export async function dismissCookieConsent(page: Page) {
  const declineBtn = page.locator('button', { hasText: 'Refuser' })
  if (await declineBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await declineBtn.click()
  }
}
