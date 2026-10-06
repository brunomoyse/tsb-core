import type { Page } from '@playwright/test'
import { expect, test } from './support/test'
import { holdHydration } from './support/hydration'
import { openLogin } from './support/login'
import { SEL } from './support/selectors'

/*
 * What a visitor types into a server-rendered form before the app has hydrated (a second or two on a slow phone):
 * - the form must not submit natively as a GET, which would put the address in the URL (logs, history, analytics): the
 *   forms are `method="post"`;
 * - an email field must keep what was typed or autofilled (Vue's v-model empties `type="email"` fields when it hydrates).
 */
test.beforeEach(({ backend }) => {
  test.skip(!backend.isMock, 'needs the mock')
})

const hydrated = (page: Page) =>
  page.waitForFunction(() => '__vue_app__' in document.getElementById('__nuxt')!, undefined, {
    timeout: 15_000,
  })

test.describe('the login form', () => {
  test('keeps the address typed before hydration, and then sends it', async ({ page }) => {
    await openLogin(page)
    const release = await holdHydration(page)
    await page.goto(page.url(), { waitUntil: 'commit' })

    const email = page.locator('#auth-email')
    await email.waitFor({ state: 'visible' })
    await email.fill('eva@example.com')
    await expect(page.locator('form:has(#auth-email)')).toHaveAttribute('method', 'post')

    await release()
    await hydrated(page)
    await expect(email).toHaveValue('eva@example.com')
    // The model has it too: the form sends it without typing again.
    await page.locator(SEL.loginSubmit).click()
    await expect(page.locator('#auth-code')).toBeVisible()
  })

  test('a submit before hydration is a POST: the address is not in the URL', async ({ page }) => {
    await openLogin(page)
    await holdHydration(page)
    await page.goto(page.url(), { waitUntil: 'commit' })

    const email = page.locator('#auth-email')
    await email.waitFor({ state: 'visible' })
    await email.fill('eva@example.com')
    const sent = page.waitForRequest((request) => request.isNavigationRequest())
    await email.press('Enter')
    const request = await sent
    expect(request.method()).toBe('POST')
    expect(request.url()).not.toContain('eva')
    expect(request.url()).not.toContain('email=')
  })
})

test('the contact form keeps the address typed before hydration', async ({ page }) => {
  const release = await holdHydration(page)
  await page.goto('/fr/contact', { waitUntil: 'commit' })
  const email = page.locator('#feedback-email')
  await email.waitFor({ state: 'visible' })
  await email.fill('eva@example.com')
  await expect(page.locator('form:has(#feedback-email)')).toHaveAttribute('method', 'post')

  await release()
  await hydrated(page)
  await expect(email).toHaveValue('eva@example.com')
})
