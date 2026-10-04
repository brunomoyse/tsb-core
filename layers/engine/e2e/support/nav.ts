import { type Page, expect } from '@playwright/test'
import type { Locale } from './locale'

/*
 * Navigation chrome shared by both brands: on a phone the links sit behind the hamburger (`aria-controls="mobile-menu"`,
 * under 640 px), above it they are always there. Both brands expose the language picker as
 * `data-testid="language-picker"` and its entries as `language-option-<code>`.
 */

/** Opens the phone menu when there is one (a no-op on a desktop layout). */
export async function openMobileMenu(page: Page): Promise<void> {
  const burger = page.locator('button[aria-controls="mobile-menu"]')
  if (!(await burger.isVisible())) return
  if ((await burger.getAttribute('aria-expanded')) !== 'true') await burger.click()
  await expect(burger).toHaveAttribute('aria-expanded', 'true')
}

/** Picks a language in the picker, wherever it is on this viewport, and waits for the new locale's URL. */
export async function switchLanguage(page: Page, code: Locale): Promise<void> {
  await openMobileMenu(page)
  await page.locator('[data-testid="language-picker"]:visible').first().click()
  await page.locator(`[data-testid="language-option-${code}"]`).click()
  await page.waitForURL(new RegExp(`/${code}(?:[/?#]|$)`, 'u'))
}

/** One simple product in the cart, set to pickup (a guest otherwise meets the delivery-zone gate at the checkout). */
export async function addSimpleProductToCart(page: Page, path = '/fr/menu'): Promise<void> {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  await page
    .locator(
      '[data-testid="product-card"][data-has-choices="false"] [data-testid="product-add-to-cart"]:not([disabled])',
    )
    .first()
    .click()
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (JSON.parse(localStorage.getItem('cart') ?? '{}') as { products?: unknown[] }).products
            ?.length ?? 0,
      ),
    )
    .toBe(1)
  const pickup = page.locator('[data-testid="cart-option-pickup"]:visible')
  if (await pickup.count()) await pickup.first().click()
}

/** The cart lines persisted in localStorage (`{ productId, quantity, selections }`), whichever layout shows them. */
export const cartLines = (page: Page) =>
  page.evaluate(
    () =>
      (
        JSON.parse(localStorage.getItem('cart') ?? '{}') as {
          products?: { productId: string; quantity: number }[]
        }
      ).products ?? [],
  )
