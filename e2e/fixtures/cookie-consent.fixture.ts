import type { Page } from '@playwright/test'

/** Wait for Nuxt to finish hydrating all components. */
export async function waitForNuxtHydration(page: Page) {
  await page.waitForFunction(() => {
    const app = document.querySelector('#__nuxt')?.__vue_app__
    return app && !app.$nuxt?.isHydrating
  }, { timeout: 15_000 })
}

// No-op: cookie consent banner was removed (Umami analytics doesn't use cookies)
export async function dismissCookieConsent(_page: Page) {}
