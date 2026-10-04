import {
  chooseCollection,
  choosePayment,
  fillCart,
  gotoCheckout,
  gotoMenu,
  openCart,
  payButton,
  waitForQuote,
} from './support/order-flow'
import { expect, test } from './support/test'

/*
 * What the customer can do when the restaurant is closed, only open for pre-orders, switched off, or changes state while
 * they are on the checkout (pushed by the live restaurant-config subscription), both brands, on a phone. The opening
 * state is the mock's `restaurant()` scenario; the order the app sends is read back from the mock.
 */

test.skip(({ mock }) => !mock, 'needs the mock tsb-service (restaurant scenarios, live push)')
test.skip(({ isMobile }) => !isMobile, 'phone layout')

const PHONE = '+32470123456'
const GYOZA = /Gyoza/u

test.beforeEach(async ({ backend }) => {
  await backend.mock.user({ phoneNumber: PHONE })
})

test.describe('Closed restaurant', () => {
  test('the menu says so, the cart cannot go to checkout and the checkout refuses the order', async ({
    authenticatedPage: page,
    backend,
    brand,
  }) => {
    await fillCart(page, [GYOZA]) // Open: possible to add
    await backend.mock.restaurant('closed')

    await test.step('menu: a closed banner (the cart can still be filled, ordering is what is blocked)', async () => {
      await gotoMenu(page)
      await expect(page.getByTestId('menu-restaurant-closed')).toBeVisible()
      const card = page.getByTestId('product-card').filter({ hasText: 'Mochi' }).first()
      await card.scrollIntoViewIfNeeded()
      await expect(card.getByTestId('product-add-to-cart')).toBeEnabled()
    })

    await test.step('cart sheet: ordering is unavailable and checkout is blocked', async () => {
      const sheet = await openCart(page)
      // TS defaults to delivery, whose 25,00 minimum would block the link by itself: take pickup out of the way.
      if (brand === 'tokyosushi') await sheet.getByTestId('cart-switch-to-pickup').click()
      await expect(sheet).toContainText('Commandes indisponibles')
      await expect(sheet.getByRole('link', { name: 'Valider la commande' })).toHaveAttribute(
        'aria-disabled',
        'true',
      )
    })

    await test.step('checkout: closed banner with the next opening, pay disabled, nothing sent', async () => {
      await page.goto('/fr/checkout')
      const banner = page.getByTestId('checkout-restaurant-closed')
      await expect(banner).toBeVisible()
      await expect(banner).toContainText('actuellement fermé')
      await expect(banner).toContainText('Ouverture à')
      await expect(payButton(page)).toBeDisabled()
      // The collection card has nothing to pick a time from.
      await expect(page.getByTestId('checkout-preferred-time')).toHaveCount(0)
      expect(await backend.mock.operations('createOrder')).toHaveLength(0)
    })
  })

  test('with ordering switched off the checkout says "disabled" and pay stays off', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await fillCart(page, [GYOZA])
    await backend.mock.restaurant('disabled')
    await page.goto('/fr/checkout')
    await expect(page.getByTestId('checkout-restaurant-closed')).toBeVisible()
    await expect(page.getByText('Les commandes sont actuellement désactivées')).toBeVisible()
    await expect(payButton(page)).toBeDisabled()
    // The menu does not take new products either.
    await gotoMenu(page)
    const card = page.getByTestId('product-card').filter({ hasText: 'Mochi' }).first()
    await card.scrollIntoViewIfNeeded()
    await expect(card.getByTestId('product-add-to-cart')).toBeDisabled()
  })
})

test.describe('Closed, with time slots still bookable today (pre-order)', () => {
  test.beforeEach(async ({ backend }) => {
    await backend.mock.restaurant('scheduled-only')
  })

  test('only fixed slots are offered, the first one is preselected and the order carries the chosen slot', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await fillCart(page, [GYOZA])
    await gotoCheckout(page)
    await chooseCollection(page, 'pickup')

    const banner = page.getByTestId('checkout-preorder-banner')
    await expect(banner).toContainText('Nous sommes fermés pour le moment')
    await expect(page.getByTestId('checkout-restaurant-closed')).toHaveCount(0)

    const select = page.getByTestId('checkout-preferred-time')
    await expect(select).toBeVisible()
    await expect(page.getByText('« dès que possible »')).toBeVisible()
    // No "as soon as possible" while closed: only fixed times, the first one chosen.
    const options = select.locator('option')
    expect(await options.count()).toBeGreaterThan(2)
    await expect(options.filter({ hasText: 'Dès que possible' })).toHaveCount(0)
    const first = await options.first().getAttribute('value')
    await expect(select).toHaveValue(first ?? '')
    // The banner names the slot that is preselected.
    await expect(banner).toContainText((await options.first().innerText()).trim())

    // Another slot, then a cash order.
    const third = (await options.nth(2).getAttribute('value')) ?? ''
    expect(third).not.toBe(first)
    await select.selectOption(third)
    await choosePayment(page, 'cash')
    await page.getByTestId('cash-acknowledge').check()
    await waitForQuote(page)
    await expect(payButton(page)).toBeEnabled()
    await payButton(page).click()
    await page.waitForURL('**/fr/order-completed/**')

    const [order] = await backend.mock.createdOrders()
    expect(order?.input).toMatchObject({ preferredReadyTime: third, orderType: 'PICKUP' })
    expect((await backend.mock.operations('quoteOrder')).at(-1)?.args.input).toMatchObject({
      preferredReadyTime: third,
    })
  })

  test('a slot that goes by while the customer reads the page is replaced by the next one, with a notice', async ({
    authenticatedPage: page,
  }) => {
    await page.clock.install()
    await fillCart(page, [GYOZA])
    await gotoCheckout(page)
    await chooseCollection(page, 'pickup')
    const select = page.getByTestId('checkout-preferred-time')
    const first = (await select.locator('option').first().getAttribute('value')) ?? ''
    await expect(select).toHaveValue(first)

    // 45 minutes later the first slot is inside the preparation window: it is no longer offered.
    await page.clock.fastForward('45:00')
    await expect(page.getByText('Votre créneau horaire a expiré').first()).toBeVisible()
    await expect(select.locator(`option[value="${first}"]`)).toHaveCount(0)
    await expect(select).not.toHaveValue(first)
    await expect(select).toHaveValue(
      (await select.locator('option').first().getAttribute('value')) ?? '',
    )
  })

  test('the cart sheet advertises the pre-order time instead of "unavailable"', async ({
    authenticatedPage: page,
    brand,
  }) => {
    await fillCart(page, [GYOZA])
    const sheet = await openCart(page)
    if (brand === 'tokyosushi') await sheet.getByTestId('cart-switch-to-pickup').click()
    await expect(sheet.getByTestId('cart-preorder-hint')).toContainText(
      'Nous sommes fermés pour le moment',
    )
    await expect(sheet).not.toContainText('Commandes indisponibles')
    await expect(sheet.getByRole('link', { name: 'Valider la commande' })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })
})

test.describe('The restaurant changes state while the customer is on the checkout', () => {
  const subscribed = (backend: {
    mock: { waitFor: (p: (s: { subscriptions: string[] }) => boolean) => Promise<unknown> }
  }) => backend.mock.waitFor((state) => state.subscriptions.includes('restaurantConfigUpdated'))

  test('opening: the closed banner goes away and the order can be paid', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await fillCart(page, [GYOZA])
    await backend.mock.restaurant('closed')
    await gotoCheckout(page)
    await chooseCollection(page, 'pickup')
    await choosePayment(page, 'cash')
    await page.getByTestId('cash-acknowledge').check()
    await expect(page.getByTestId('checkout-restaurant-closed')).toBeVisible()
    await expect(payButton(page)).toBeDisabled()
    await subscribed(backend)

    await backend.mock.restaurant('open')
    await expect(page.getByTestId('checkout-restaurant-closed')).toHaveCount(0)
    await expect(payButton(page)).toBeEnabled()
    await payButton(page).click()
    await page.waitForURL('**/fr/order-completed/**')
    expect(await backend.mock.createdOrders()).toHaveLength(1)
  })

  test('closing: the customer is sent back to the cart with a notice, and nothing is ordered', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await fillCart(page, [GYOZA])
    await gotoCheckout(page)
    await subscribed(backend)

    await backend.mock.restaurant('closed')
    await page.waitForURL('**/fr/cart')
    await expect(
      page.getByText('Les commandes ne sont pas disponibles actuellement').first(),
    ).toBeVisible()
    expect(await backend.mock.operations('createOrder')).toHaveLength(0)
  })

  test('opening hours that cannot be loaded give an error with Retry, not a "closed" restaurant', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await fillCart(page, [GYOZA])
    await backend.mock.failOperation('restaurantConfig', { code: 'INTERNAL' })
    await page.goto('/fr/checkout')
    const error = page.getByTestId('checkout-config-error')
    await expect(error).toBeVisible()
    await expect(error).toContainText('Impossible de vérifier si les commandes sont ouvertes')
    await expect(page.getByTestId('checkout-restaurant-closed')).toHaveCount(0)

    await backend.mock.failOperation('restaurantConfig', null)
    await error.getByTestId('load-error-retry').click()
    await expect(error).toHaveCount(0)
    await expect(payButton(page)).toBeVisible()
    await chooseCollection(page, 'pickup')
    await waitForQuote(page)
    await expect(payButton(page)).toBeEnabled()
  })
})
