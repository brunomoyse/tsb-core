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

/**
 * The bottom edge of what stays on screen at the top while scrolling (the fixed phone navbar, a sticky category strip):
 * content that lands above this line is hidden behind it.
 */
export function stickyBottom(page: Page): Promise<number> {
  return page.evaluate(() => {
    let bottom = 0
    for (const el of document.body.querySelectorAll('*')) {
      const { position } = getComputedStyle(el)
      if (position !== 'fixed' && position !== 'sticky') continue
      if (el.closest('[inert], [aria-hidden="true"]')) continue
      const rect = el.getBoundingClientRect()
      if (rect.height === 0 || rect.width < window.innerWidth * 0.5) continue
      // Pinned to the top: it starts within the first 120 px and is on screen.
      if (rect.top > 120 || rect.bottom <= 0) continue
      bottom = Math.max(bottom, rect.bottom)
    }
    return bottom
  })
}

/** Ids of the categories on the menu, in order (each section is `id="category-<id>"`, each chip `data-chip-category`). */
export const categoryIds = (page: Page) =>
  page
    .locator('[data-chip-category]')
    .evaluateAll((chips) => chips.map((chip) => chip.getAttribute('data-chip-category') ?? ''))

/** Whether the chip of a category is the selected one (`aria-pressed` in one brand, `aria-current` in the other). */
export const chipIsActive = (page: Page, id: string) =>
  page
    .locator(`[data-chip-category="${id}"]`)
    .evaluate(
      (chip) =>
        chip.getAttribute('aria-pressed') === 'true' ||
        chip.getAttribute('aria-current') === 'true',
    )

/** Whether a category chip is (almost) entirely inside the visible part of its horizontally scrolling strip. */
export const chipVisibleInRow = (page: Page, id: string) =>
  page.locator(`[data-chip-category="${id}"]`).evaluate((chip) => {
    const row = chip.parentElement
    if (!row) return false
    const a = chip.getBoundingClientRect()
    const b = row.getBoundingClientRect()
    // Nine tenths of the chip inside the strip (the strips fade their edges, a chip may touch one).
    const inside = Math.min(a.right, b.right) - Math.max(a.left, b.left)
    return inside >= a.width * 0.9
  })

/**
 * A guest with a product in the cart gets to the sign-in step of the checkout: where delivery exists, the delivery-zone
 * gate comes first (the "Pickup" radio of its picker skips it); a pickup-only brand has no gate.
 */
export async function guestCheckoutSignIn(
  page: Page,
  gateTitle: string,
  pickupLabel: string,
  path = '/fr/checkout',
): Promise<void> {
  await page.goto(path)
  const gate = page.getByRole('region').filter({ hasText: gateTitle })
  const signIn = page.getByTestId('login-submit')
  await expect(gate.or(signIn)).toBeVisible()
  if (await gate.isVisible()) await gate.getByRole('radio', { name: pickupLabel }).click()
  await expect(signIn).toBeVisible()
}
