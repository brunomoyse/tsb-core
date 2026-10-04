import { type Locator, type Page, expect } from '@playwright/test'
import { waitForNuxtHydration } from './hydration'

/*
 * Building blocks of the order journeys (cart, checkout, payment, tracking), written for the PHONE layout first and
 * working on the desktop one too: the specs never ask "which viewport is this", the helpers do (a floating cart bar
 * and a sheet on a phone, the side cart on a desktop).
 *
 * They only know what a customer sees (product names, buttons, totals). The product names are the mock catalog's
 * (e2e/mock/catalog); a brand that lacks a product is the spec's business (`brand` fixture).
 */

/** "17,90 €" -> 17.9 */
export const eurosOf = (text: string | null | undefined): number =>
  Number((text ?? '').replace(/[^\d,]/gu, '').replace(',', '.'))

/** The persisted cart's lines (`cart` in localStorage, utils/cartPersistence.ts). */
export const cartLines = (page: Page) =>
  page.evaluate(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('cart') ?? '{}') as {
        products?: { productId: string; quantity: number; selections?: unknown[] }[]
      }
      return raw.products ?? []
    } catch {
      return []
    }
  })

/** The persisted cart in full (collection option, payment option, coupon, ...). */
export const cartState = (page: Page) =>
  page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem('cart') ?? '{}') as Record<string, unknown>
    } catch {
      return {}
    }
  })

export async function noHorizontalScroll(page: Page, label: string): Promise<void> {
  const widths = await page.evaluate(() => ({
    scroll: document.scrollingElement?.scrollWidth ?? 0,
    inner: window.innerWidth,
  }))
  expect(widths.scroll, `${label}: the page scrolls sideways`).toBeLessThanOrEqual(widths.inner)
}

/** The element is rendered and entirely inside the viewport's width. */
export async function inViewport(page: Page, locator: Locator, label: string): Promise<void> {
  const box = await locator.boundingBox()
  const width = page.viewportSize()?.width ?? 0
  expect(box, `${label}: not rendered`).not.toBeNull()
  expect(box?.x ?? 0, `${label}: starts left of the viewport`).toBeGreaterThanOrEqual(-0.5)
  expect(
    (box?.x ?? 0) + (box?.width ?? 0),
    `${label}: ends right of the viewport`,
  ).toBeLessThanOrEqual(width + 0.5)
}

/** Two boxes share no pixel: used for "the controls do not overlap". */
export async function expectNoOverlap(a: Locator, b: Locator, label: string): Promise<void> {
  const [boxA, boxB] = [await a.boundingBox(), await b.boundingBox()]
  expect(boxA, `${label}: first element not rendered`).not.toBeNull()
  expect(boxB, `${label}: second element not rendered`).not.toBeNull()
  if (!boxA || !boxB) return
  const overlapX = Math.min(boxA.x + boxA.width, boxB.x + boxB.width) - Math.max(boxA.x, boxB.x)
  const overlapY = Math.min(boxA.y + boxA.height, boxB.y + boxB.height) - Math.max(boxA.y, boxB.y)
  expect(overlapX > 0.5 && overlapY > 0.5, `${label}: the two elements overlap`).toBe(false)
}

/**
 * A signed-in visitor's first page load ends with the app re-reading the profile (`AuthSyncMe`, once the app is idle) and
 * storing it as the `auth` user. A full navigation while that request is in flight aborts it, and the app then drops the
 * session (see the BUG test in mobile-checkout-errors.spec.ts): wait for the profile before navigating away. A no-op for a
 * visitor who is not signed in.
 */
export async function sessionSettled(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const signedIn = Object.keys(localStorage).some((key) => key.startsWith('oidc.user:'))
      if (!signedIn) return true
      try {
        return Boolean(
          (JSON.parse(localStorage.getItem('auth') ?? '{}') as { user?: unknown }).user,
        )
      } catch {
        return false
      }
    },
    undefined,
    { timeout: 15_000 },
  )
}

export async function gotoMenu(page: Page): Promise<void> {
  await page.goto('/fr/menu')
  await waitForNuxtHydration(page)
  await sessionSettled(page)
  await expect(page.getByTestId('product-card').first()).toBeVisible()
}

export const productCard = (page: Page, name: string | RegExp): Locator =>
  page.getByTestId('product-card').filter({ hasText: name }).first()

/** Adds one unit of a product WITHOUT choices from its card on the menu (the card then shows a stepper, or its count). */
export async function addPlain(page: Page, name: string | RegExp): Promise<void> {
  const card = productCard(page, name)
  await card.scrollIntoViewIfNeeded()
  const before = (await cartLines(page)).length
  await card.getByTestId('product-add-to-cart').click()
  await expect.poll(async () => (await cartLines(page)).length).toBeGreaterThanOrEqual(before)
  await expect(
    card.getByRole('button', { name: /dans le panier|Augmenter la quantité/u }).first(),
  ).toBeVisible()
}

/** Opens the details modal of a product (the only way to add one that has choices on the TS menu). */
export async function openProductModal(page: Page, name: string | RegExp): Promise<Locator> {
  const card = productCard(page, name)
  await card.scrollIntoViewIfNeeded()
  const modal = page.getByTestId('product-modal')
  // A click before hydration lands on inert markup: retry until the modal opens.
  await expect(async () => {
    await card.getByTestId('product-name').click()
    await expect(modal).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 15_000 })
  return modal
}

/** Multi-select rows have a "+"; pick-one rows are themselves the button. */
export async function pickChoice(
  page: Page,
  root: Locator,
  prefix: string,
  name: string,
  times = 1,
): Promise<void> {
  const row = root
    .locator(
      `[data-testid^="${prefix}-choice-"]:not([data-testid*="-inc-"]):not([data-testid*="-dec-"])`,
    )
    .filter({ has: page.getByText(name, { exact: true }) })
    .first()
  await expect(row).toBeVisible()
  const increment = row.locator(`[data-testid^="${prefix}-choice-inc-"]`)
  const multi = (await increment.count()) > 0
  for (let i = 0; i < times; i++) await (multi ? increment : row).click()
}

/** The cart container the viewport shows: the side cart (desktop) or the sheet (phone, opened by the floating bar). */
export async function openCart(page: Page): Promise<Locator> {
  const side = page.getByTestId('side-cart')
  const sheet = page.getByTestId('cart-mobile')
  const bar = page.getByTestId('floating-cart-bar')
  await expect
    .poll(
      async () => (await side.isVisible()) || (await bar.isVisible()) || (await sheet.isVisible()),
    )
    .toBe(true)
  if (await side.isVisible()) return side
  if (!(await sheet.isVisible())) {
    await bar.click()
    await expect(sheet).toBeVisible()
    // The sheet slides up: wait until it stops moving before asserting positions.
    let last = -1
    await expect
      .poll(
        async () => {
          const y = (await sheet.boundingBox())?.y ?? -2
          const settled = y === last
          last = y
          return settled
        },
        { intervals: [150] },
      )
      .toBe(true)
  }
  return sheet
}

/** Closes the phone sheet (no-op on desktop). */
export async function closeCart(page: Page): Promise<void> {
  const sheet = page.getByTestId('cart-mobile')
  if (await sheet.isVisible().catch(() => false)) {
    await sheet.getByRole('button', { name: 'Fermer le panier' }).click()
    await expect(sheet).toBeHidden()
  }
}

/** The pay button of the viewport (the page renders a bar for phones and a button in the card for desktops). */
export const payButton = (page: Page): Locator =>
  page.locator('[data-testid="checkout-place-order"]:visible').first()

/**
 * Opens /checkout with the cart as it is (it lives in localStorage, so a hard load keeps it) and waits for the pay
 * button. The default session is signed in as "Eva Mock" WITHOUT a phone number: pass `phone` to save one on the
 * account first (the checkout asks for it before any order).
 */
export async function gotoCheckout(page: Page): Promise<void> {
  await page.goto('/fr/checkout')
  await waitForNuxtHydration(page)
  await sessionSettled(page)
  await expect(payButton(page)).toBeVisible({ timeout: 20_000 })
}

/** Picks pickup or delivery on the checkout page (the radio of the collection card). */
export async function chooseCollection(page: Page, option: 'pickup' | 'delivery'): Promise<void> {
  const radio = page.getByTestId(`checkout-option-${option}`)
  await radio.click()
  await expect(radio).toHaveAttribute('aria-checked', 'true')
}

/** Picks a payment method on the checkout page. */
export async function choosePayment(page: Page, method: 'online' | 'cash'): Promise<void> {
  const radio = page.getByTestId(`payment-${method}`)
  await radio.click()
  await expect(radio).toHaveAttribute('aria-checked', 'true')
}

/** Waits until the quote of the page has settled (no "updating" hint anywhere). */
export async function waitForQuote(page: Page): Promise<void> {
  await expect(
    page.locator(
      '[data-testid="checkout-quote-updating"]:visible, [data-testid="checkout-quote-updating-desktop"]:visible',
    ),
  ).toHaveCount(0, { timeout: 20_000 })
}

/**
 * What the customer is about to pay: the amount on the phone's pay bar ("Aller au paiement  17,90 €"), or on a
 * desktop, where the button carries no amount, the total of the summary card.
 */
export async function payAmount(page: Page): Promise<number> {
  const text = await payButton(page).innerText()
  const amounts = text.match(/\d+,\d{2}\s*€/gu) ?? []
  if (amounts.length > 0) return eurosOf(amounts.at(-1))
  return eurosOf(await summaryRow(page, /^Total/u).innerText())
}

/** Opens the address sheet of the delivery card and picks a mock place (the query needs a house number, as the field's does). */
export async function pickDeliveryAddress(page: Page, query: string): Promise<void> {
  const open = page.getByRole('button', { name: /Ajouter une adresse|Modifier l.adresse/u }).first()
  await open.click()
  const dialog = page.getByRole('dialog', { name: /adresse/iu })
  await expect(dialog).toBeVisible()
  const input = dialog.getByRole('combobox')
  await input.fill(query)
  const suggestion = dialog.getByRole('option').first()
  await expect(suggestion).toBeVisible()
  await suggestion.dispatchEvent('mousedown')
  await expect(dialog.getByTestId('address-selected')).toBeVisible()
  await dialog.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(dialog).toBeHidden()
}

/** The "Votre commande" card of the checkout (lines + price breakdown). */
export const checkoutSummary = (page: Page): Locator =>
  page
    .locator('section.card')
    .filter({ has: page.getByRole('heading', { name: 'Votre commande' }) })

/** One row of its breakdown by label ("Sous-total", "Frais de livraison", "Remise (à emporter)", "Total"...). */
export const summaryRow = (page: Page, label: string | RegExp): Locator =>
  checkoutSummary(page).locator('div.justify-between', { hasText: label }).last()

/** Opens the menu and adds one unit of each named plain product (the cart persists, so a later `goto` keeps it). */
export async function fillCart(page: Page, names: (string | RegExp)[]): Promise<void> {
  await gotoMenu(page)
  for (const name of names) await addPlain(page, name)
}
