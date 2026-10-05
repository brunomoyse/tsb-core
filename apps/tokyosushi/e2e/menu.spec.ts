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

test.describe('Menu browsing', () => {
  test('Products render with category tabs', async ({ page }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)

    // Products should be visible
    await expect(page.locator(SEL.productCard).first()).toBeVisible()
    // Category tabs should be visible
    await expect(page.locator(SEL.categoryCard).first()).toBeVisible()
    // Should have multiple categories
    const categoryCount = await page.locator(SEL.categoryCard).count()
    expect(categoryCount).toBeGreaterThan(1)
  })

  test('Search filters products', async ({ page }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)
    await page.locator(SEL.productCard).first().waitFor()

    const initialCategoryCount = await page.locator(SEL.categoryCard).count()

    // Click the search bar area to expand the input, then type
    await page.locator('#menuSearch').focus()
    await page.keyboard.type('gyoza', { delay: 50 })

    // Wait for debounced search (300ms) to take effect — category tab count should decrease
    await expect(async () => {
      const filteredCategoryCount = await page.locator(SEL.categoryCard).count()
      expect(filteredCategoryCount).toBeLessThan(initialCategoryCount)
    }).toPass({ timeout: 5_000 })
  })

  test('Product with choices opens modal', async ({ page }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)
    await page.locator(SEL.productCard).first().waitFor()

    const choiceProduct = page.locator(SEL.choiceProduct).first()
    if (await choiceProduct.isVisible().catch(() => false)) {
      // Click the product image area — event bubbles to parent div with @click handler
      await choiceProduct.locator('img').first().click()

      // Wait for the router.push({ query: { product: id } }) to take effect
      await page.waitForURL('**product=**', { timeout: 5_000 })

      // Modal fetches product data via GraphQL — wait with generous timeout
      await expect(page.locator(SEL.productModal)).toBeVisible({ timeout: 15_000 })

      // Modal should have an add-to-cart button
      await expect(page.locator(SEL.productModalAddToCart)).toBeVisible()

      // Close modal with Escape
      await page.keyboard.press('Escape')
      await expect(page.locator(SEL.productModal)).not.toBeVisible()
    } else {
      test.skip(true, 'No products with choices available')
    }
  })

  test('Choice product gates add-to-cart on selections', async ({ page }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)
    await page.locator(SEL.productCard).first().waitFor()

    const choiceProduct = page.locator(SEL.choiceProduct).first()
    if (!(await choiceProduct.isVisible().catch(() => false))) {
      test.skip(true, 'No products with choices available')
      return
    }
    await choiceProduct.locator('img').first().click()
    await page.waitForURL('**product=**', { timeout: 5_000 })
    await expect(page.locator(SEL.productModal)).toBeVisible({ timeout: 15_000 })

    /*
     * At 0 selections the add button stays clickable but must not add: the
     * click flags the first incomplete group and the modal stays open. This
     * is the real gating invariant. (The button is only disabled when
     * ordering itself is unavailable, in which case there is nothing to click.)
     */
    const addButton = page.locator(SEL.productModalAddToCart)
    if (await addButton.isEnabled()) {
      await addButton.click()
      await expect(
        page.locator('[data-testid="product-modal-group"][data-invalid="true"]').first(),
      ).toBeVisible()
      await expect(page.locator(SEL.productModal)).toBeVisible()
    }

    await page.keyboard.press('Escape')
  })

  /*
   * The category strip's scroll listener (it drives the arrow fades) is bound to the strip element and released with it:
   * leaving the menu used to remove it through a template ref that was already null, so the listener stayed on the detached
   * strip (and its frame was not cancelled), and a strip that came back after a search had none. Counts the scroll listeners
   * each strip element holds.
   */
  test('the category strip releases its scroll listener when the page unmounts and follows a new strip', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const holders = new Map<EventTarget, number>()
      // oxlint-disable-next-line typescript/unbound-method -- called back with `this` below
      const add = EventTarget.prototype.addEventListener
      // oxlint-disable-next-line typescript/unbound-method -- called back with `this` below
      const remove = EventTarget.prototype.removeEventListener
      const isStrip = (target: EventTarget) =>
        target instanceof HTMLElement && target.querySelector('[data-chip-category]') !== null
      EventTarget.prototype.addEventListener = function addEventListener(type, ...rest) {
        if (type === 'scroll' && isStrip(this)) holders.set(this, (holders.get(this) ?? 0) + 1)
        add.call(this, type, ...(rest as [EventListener]))
      }
      EventTarget.prototype.removeEventListener = function removeEventListener(type, ...rest) {
        if (type === 'scroll' && holders.has(this)) holders.set(this, (holders.get(this) ?? 1) - 1)
        remove.call(this, type, ...(rest as [EventListener]))
      }
      ;(window as unknown as { stripListeners: () => number[][] }).stripListeners = () =>
        [...holders].map(([el, count]) => [(el as HTMLElement).isConnected ? 1 : 0, count])
    })
    const listeners = () =>
      page.evaluate(() =>
        (window as unknown as { stripListeners: () => number[][] }).stripListeners(),
      )

    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await page.locator(SEL.categoryCard).first().waitFor()
    // [connected, listeners]: one strip, listened to.
    expect(await listeners()).toEqual([[1, 1]])

    // A search takes the strip out of the page; clearing it brings a new element, which is listened to in its turn.
    await page.locator('#menuSearch').fill('gyoza')
    await expect(page.locator(SEL.categoryCard)).toHaveCount(0)
    await page.locator('#menuSearch').fill('')
    await page.locator(SEL.categoryCard).first().waitFor()
    await expect.poll(listeners).toEqual([
      [0, 0],
      [1, 1],
    ])

    // Leaving the menu (client-side) releases it from the strip that is going away.
    await page.locator('a[href="/fr"]:visible').first().click()
    await page.waitForURL(/\/fr\/?$/u)
    await expect.poll(listeners).toEqual([
      [0, 0],
      [0, 0],
    ])
  })
})
