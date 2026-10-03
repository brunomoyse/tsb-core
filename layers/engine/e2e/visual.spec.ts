import type { Locator, Page } from '@playwright/test'
import { expect, test } from './support/test'
import { waitForLoginPage } from './support/auth-flow'
import { waitForNuxtHydration } from './support/hydration'

/*
 * Screenshot tests for the shared engine pages, run by every brand app with
 * per-brand baselines (apps/<brand>/e2e/__screenshots__/). They catch the
 * failure lint and functional tests can't: a styling change made for one brand
 * that looks wrong on the other.
 *
 * Determinism:
 *  - The cart is seeded straight into the Pinia persisted state with two made-up
 *    products, so screenshots don't depend on either brand's live menu. The cart
 *    never revalidates products against the API, so fake ids are fine. Slugs
 *    match no brand photo, so every brand shows its image fallback.
 *  - Ordering is forced open 24/7 by each app's global-setup.
 *  - Time slots and other clock-driven values are masked.
 *
 * Update baselines after an intended visual change:
 *   npm run test:visual:update      (from tsb-core, both brands)
 * then review the PNG diffs in git before committing.
 */

const category = { id: 'visual-cat', name: 'Visual', slug: 'visual', order: 0 }

const fakeProduct = (n: number, name: string, price: string) => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  slug: `visual-test-product-${n}`,
  name,
  description: null,
  price,
  code: null,
  categoryId: category.id,
  category,
  choices: [],
  choiceGroups: [],
  isAvailable: true,
  isDiscountable: true,
  isHalal: false,
  isLunchOnly: false,
  isSpicy: false,
  isVegetarian: false,
  isVisible: true,
  pieceCount: null,
})

const seededCart = {
  products: [
    {
      product: fakeProduct(1, 'Produit test A', '12.50'),
      quantity: 2,
      selectedChoices: [],
      selectedChoice: null,
    },
    {
      product: fakeProduct(2, 'Produit test B', '8.00'),
      quantity: 1,
      selectedChoices: [],
      selectedChoice: null,
    },
  ],
  collectionOption: 'PICKUP',
  couponCode: null,
  couponDiscount: 0,
  paymentOption: 'ONLINE',
  cashPaymentAmount: null,
  address: null,
  addressExtra: null,
  orderExtra: [],
  orderNote: null,
  preferredReadyTime: null,
}

async function seedCart(page: Page) {
  await page.addInitScript((cart) => {
    localStorage.setItem('cart', JSON.stringify(cart))
  }, seededCart)
}

async function snap(page: Page, name: string, mask: Locator[] = []) {
  await waitForNuxtHydration(page)
  await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    mask,
    maxDiffPixelRatio: 0.01,
  })
}

// Each test gets a fresh browser context, so storage starts empty unless a test seeds it.
test.describe('Engine pages look right per brand', { tag: '@visual' }, () => {
  test('cart, empty', async ({ page }) => {
    await page.goto('/fr/cart')
    await snap(page, 'cart-empty')
  })

  test('cart, with items', async ({ page }) => {
    await seedCart(page)
    await page.goto('/fr/cart')
    await expect(page.getByText('Produit test A').first()).toBeVisible({ timeout: 15_000 })
    await snap(page, 'cart-filled')
  })

  test('checkout, guest sign-in step', async ({ page }) => {
    await seedCart(page)
    await page.goto('/fr/checkout')
    // Guests get the sign-in step first (cart kept, "3 articles"), embedding AuthFlow.
    await page.locator('#auth-email').waitFor({ state: 'visible', timeout: 15_000 })
    await snap(page, 'checkout-guest-signin')
  })

  test('checkout, logged in, pickup', async ({ authenticatedPage: page }) => {
    await seedCart(page)
    await page.goto('/fr/checkout')
    await expect(page.getByText('Produit test A').first()).toBeVisible({ timeout: 15_000 })
    // Time slots follow the clock; paid extras are live menu data from the API.
    await snap(page, 'checkout-pickup', [
      page.getByTestId('checkout-preferred-time'),
      page.getByTestId('checkout-paid-extras'),
    ])
  })

  test('faq', async ({ page }) => {
    await page.goto('/fr/faq')
    await snap(page, 'faq')
  })

  test('terms', async ({ page }) => {
    await page.goto('/fr/terms')
    await snap(page, 'terms')
  })

  test('login (AuthFlow)', async ({ page, baseURL, loginAvailable, loginOrigin }) => {
    test.skip(!loginAvailable, 'Zitadel login is not set up for this brand locally')
    // A login page served by a deployed site isn't the code under test: its baseline would
    // track that deployment, not local engine changes.
    test.skip(
      Boolean(loginOrigin && baseURL) && new URL(loginOrigin!).origin !== new URL(baseURL!).origin,
      'Login page is served by a deployed site, not the local app',
    )
    await page.goto('/fr/auth/login')
    // The form renders before the Zitadel authRequest bounce; wait for the round-trip so the
    // screenshot is this brand's login page, not Zitadel's or another brand's.
    await waitForLoginPage(page, loginOrigin)
    await page.locator('#auth-email').waitFor({ state: 'visible', timeout: 10_000 })
    await snap(page, 'login')
  })

  test('account page (logged in)', async ({ authenticatedPage: page }) => {
    await page.goto('/fr/me')
    await expect(page).toHaveURL(/\/fr\/me(?:[/?#]|$)/u, { timeout: 15_000 })
    // Recent orders change with every e2e run that places an order: masking hides their
    // content, and a fixed height keeps the rest of the page from shifting as the list grows.
    await page.addStyleTag({
      content:
        '[data-testid="orders-widget"] { height: 320px !important; overflow: hidden !important; }',
    })
    await snap(page, 'me', [page.getByTestId('orders-widget')])
  })
})
