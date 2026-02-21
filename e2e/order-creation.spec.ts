import { test, expect } from '@playwright/test'

test.beforeEach(async ({ context }) => {
  await context.clearCookies()
  await context.addInitScript(() => localStorage.clear())
})

test('Order creation happy path: login, add to cart, pickup, cash, place order', async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL
  const password = process.env.E2E_USER_PASSWORD

  if (!email || !password) {
    test.skip(!email || !password, 'E2E_USER_EMAIL and E2E_USER_PASSWORD must be set')
    return
  }

  await test.step('Login', async () => {
    await page.goto('/fr/login')
    // Wait for Nuxt/Vue hydration so @submit.prevent handler is attached
    await page.waitForFunction(() => !!document.querySelector('#__nuxt')?.__vue_app__)
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(password)
    await page.locator('[data-testid="login-submit"]').click()
    // Login redirects to /menu when cart is empty
    await page.waitForURL('**/fr/menu')
  })

  await test.step('Dismiss cookie consent', async () => {
    // Cookie consent banner (fixed bottom-0 z-30) blocks clicks on elements beneath it.
    // Since beforeEach clears localStorage, the banner reappears every run.
    const declineBtn = page.locator('button', { hasText: 'Refuser' })
    if (await declineBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await declineBtn.click()
    }
  })

  await test.step('Browse menu', async () => {
    // Already on /fr/menu after login redirect; wait for products to render
    await page.locator('[data-testid="product-card"]').first().waitFor()
  })

  await test.step('Add products to cart', async () => {
    // Get simple products (no choices) that have an add-to-cart button visible
    const simpleCards = page.locator('[data-testid="product-card"][data-has-choices="false"]')
    const count = await simpleCards.count()
    const toAdd = Math.min(count, 5)

    for (let i = 0; i < toAdd; i++) {
      const card = simpleCards.nth(i)
      const addBtn = card.locator('[data-testid="product-add-to-cart"]')
      // The button is only visible when item is not yet in cart
      if (await addBtn.isVisible()) {
        await addBtn.click()
        // Brief wait for cart reactivity
        await page.waitForTimeout(300)
      }
    }
  })

  await test.step('Set pickup in SideCart', async () => {
    const sideCart = page.locator('[data-testid="side-cart"]')
    await sideCart.waitFor()
    await sideCart.locator('[data-testid="cart-option-pickup"]').click()
  })

  await test.step('Ensure minimum order is met', async () => {
    // If minimum warning is visible, add more products
    const warning = page.locator('[data-testid="cart-minimum-warning"]')
    if (await warning.isVisible()) {
      const simpleCards = page.locator('[data-testid="product-card"][data-has-choices="false"]')
      const count = await simpleCards.count()
      for (let i = 0; i < count; i++) {
        const addBtn = simpleCards.nth(i).locator('[data-testid="product-add-to-cart"]')
        if (await addBtn.isVisible()) {
          await addBtn.click()
          await page.waitForTimeout(300)
        }
        // Check if minimum is now met
        if (!(await warning.isVisible())) break
      }
    }

    // Final assertion: minimum warning should be gone
    await expect(warning).not.toBeVisible()
  })

  await test.step('Go to checkout', async () => {
    await page.locator('[data-testid="cart-checkout-link"]').click()
    await page.waitForURL('**/fr/checkout')
  })

  // Wait for checkout page to render, then skip if restaurant is closed
  await page.waitForTimeout(500)
  const closedBanner = page.locator('[data-testid="checkout-restaurant-closed"]')
  if (await closedBanner.isVisible()) {
    test.skip(true, 'Restaurant is currently closed')
    return
  }

  await test.step('Select cash payment', async () => {
    await page.locator('[data-testid="payment-cash"]').click()
  })

  await test.step('Place order', async () => {
    await page.locator('[data-testid="checkout-place-order"]').click()
    await page.waitForURL('**/fr/order-completed/**', { timeout: 15_000 })
  })

  await test.step('Verify order completion', async () => {
    await expect(page.locator('[data-testid="order-completed-title"]')).toBeVisible()
  })
})
