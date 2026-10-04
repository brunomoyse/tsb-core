import { type Locator, type Page } from '@playwright/test'
import type { MockControl } from './mock/client'
import {
  chooseCollection,
  choosePayment,
  fillCart,
  gotoCheckout,
  noHorizontalScroll,
  payButton,
  waitForQuote,
} from './support/order-flow'
import { expect, test } from './support/test'

/*
 * Following an order after it is placed, on a phone, both brands: the status timeline of the confirmation page moves by
 * itself as the kitchen (the mock's `settleOrder` / `patchOrder`) pushes status changes over the WebSocket, the estimated
 * time follows, a cancellation says why, and the list of orders (/me/orders) tracks the same orders live.
 */

test.skip(({ mock }) => !mock, 'needs the mock tsb-service (live order updates)')
test.skip(({ isMobile }) => !isMobile, 'phone layout')

const timeline = (page: Page): Locator => page.getByRole('list', { name: 'Suivi de la commande' })
const current = (page: Page): Locator => timeline(page).locator('[aria-current="step"]')

/** The page is listening for this order: a push now will reach it. */
const listening = (mock: MockControl, id: string) =>
  mock.waitFor((state) => state.subscriptions.includes(`myOrderUpdated:${id}`), {
    message: `the page never subscribed to order ${id}`,
  })

const timeIn = (iso: string): string =>
  new Intl.DateTimeFormat('fr-BE', {
    timeZone: 'Europe/Brussels',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso))

const PICKUP_STEPS = [
  'Commande reçue',
  'Confirmé par le restaurant',
  'Préparation',
  'En attente de retrait',
  'Retiré',
]
const DELIVERY_STEPS = [
  'Commande reçue',
  'Confirmé par le restaurant',
  'Préparation',
  'En cours de livraison',
  'Livré',
]

test.describe('Order confirmation page, live', () => {
  test('a pickup order moves through every step as the kitchen updates it', async ({
    authenticatedPage: page,
    backend,
  }) => {
    const id = await backend.seedOrder({ status: 'PENDING', online: false, withItem: true })
    await page.goto(`/fr/order-completed/${id}`)
    await expect(page.getByTestId('order-completed-title')).toBeVisible()
    await expect(timeline(page).getByRole('listitem')).toHaveText(
      PICKUP_STEPS.map((step) => new RegExp(`^${step}`, 'u')),
    )
    await expect(current(page)).toContainText('Commande reçue')
    await expect(page.getByText('Suivi en direct')).toBeVisible()
    await listening(backend.mock, id)

    const steps = [
      ['CONFIRMED', 'Confirmé par le restaurant', 1],
      ['PREPARING', 'Préparation', 2],
      ['AWAITING_PICK_UP', 'En attente de retrait', 3],
    ] as const
    for (const [status, title, done] of steps) {
      await backend.settleOrder(id, status, 'paid')
      await expect(current(page)).toContainText(title)
      // Every earlier step reads as completed, every later one as upcoming.
      const items = timeline(page).getByRole('listitem')
      for (let index = 0; index < done; index += 1)
        await expect(items.nth(index)).toContainText('terminé')
      await expect(items.nth(done + 1)).toContainText('à venir')
      // A status change is announced to screen readers.
      await expect(page.getByTestId('announcer-polite')).toContainText(
        `Statut de la commande : ${title}`,
      )
      await noHorizontalScroll(page, `timeline at ${status}`)
    }

    // Picked up: the order is over, nothing is "current" any more.
    await backend.settleOrder(id, 'PICKED_UP', 'paid')
    await expect(current(page)).toHaveCount(0)
    await expect(timeline(page).getByRole('listitem').filter({ hasText: 'terminé' })).toHaveCount(5)
  })

  test('a delivery order has its own last steps (out for delivery, delivered)', async ({
    authenticatedPage: page,
    backend,
  }) => {
    const id = await backend.seedOrder({
      status: 'PENDING',
      online: false,
      withItem: true,
      type: 'DELIVERY',
    })
    await page.goto(`/fr/order-completed/${id}`)
    await expect(timeline(page).getByRole('listitem')).toHaveText(
      DELIVERY_STEPS.map((step) => new RegExp(`^${step}`, 'u')),
    )
    await listening(backend.mock, id)

    // A finished kitchen order is still "being prepared" for a delivery: there is no counter pick-up step.
    await backend.settleOrder(id, 'AWAITING_PICK_UP', 'paid')
    await expect(current(page)).toContainText('Préparation')
    await backend.settleOrder(id, 'OUT_FOR_DELIVERY', 'paid')
    await expect(current(page)).toContainText('En cours de livraison')
    await backend.settleOrder(id, 'DELIVERED', 'paid')
    await expect(current(page)).toHaveCount(0)
    await expect(timeline(page).getByRole('listitem').filter({ hasText: 'terminé' })).toHaveCount(5)
  })

  test('the estimated time follows the kitchen’s updates', async ({
    authenticatedPage: page,
    backend,
  }) => {
    const id = await backend.seedOrder({ status: 'CONFIRMED', online: false, withItem: true })
    const first = new Date(Date.now() + 25 * 60_000).toISOString()
    await backend.mock.patchOrder(id, { estimatedReadyTime: first })
    await page.goto(`/fr/order-completed/${id}`)
    const badge = page.getByText('Heure estimée de retrait :')
    await expect(badge).toContainText(timeIn(first))
    await listening(backend.mock, id)

    const later = new Date(Date.now() + 70 * 60_000).toISOString()
    await backend.mock.patchOrder(id, { estimatedReadyTime: later })
    await expect(badge).toContainText(timeIn(later))
    await expect(badge).not.toContainText(timeIn(first))
  })

  test('a delivery order shows the delivery wording for its estimated time', async ({
    authenticatedPage: page,
    backend,
  }) => {
    const id = await backend.seedOrder({
      status: 'CONFIRMED',
      online: false,
      withItem: true,
      type: 'DELIVERY',
    })
    const eta = new Date(Date.now() + 50 * 60_000).toISOString()
    await backend.mock.patchOrder(id, { estimatedReadyTime: eta })
    await page.goto(`/fr/order-completed/${id}`)
    await expect(page.getByText('Heure de livraison estimée :')).toContainText(timeIn(eta))
  })

  test('a cancellation replaces the timeline with the outcome and its reason', async ({
    authenticatedPage: page,
    backend,
  }) => {
    const id = await backend.seedOrder({ status: 'PREPARING', online: false, withItem: true })
    await page.goto(`/fr/order-completed/${id}`)
    await expect(current(page)).toContainText('Préparation')
    await listening(backend.mock, id)

    await backend.mock.patchOrder(id, { status: 'CANCELLED', cancellationReason: 'OUT_OF_STOCK' })
    await expect(page.getByText('Votre commande a été annulée')).toBeVisible()
    await expect(page.locator('p', { hasText: 'Motif :' })).toContainText('Rupture de stock')
    await expect(timeline(page)).toHaveCount(0)
    await expect(page.getByText('Suivi en direct')).toHaveCount(0)
    await noHorizontalScroll(page, 'cancelled order')
  })

  test('a cancellation with no specific reason says only that it was cancelled', async ({
    authenticatedPage: page,
    backend,
  }) => {
    const id = await backend.seedOrder({ status: 'CONFIRMED', online: false, withItem: true })
    await page.goto(`/fr/order-completed/${id}`)
    await expect(current(page)).toContainText('Confirmé par le restaurant')
    await listening(backend.mock, id)

    await backend.mock.patchOrder(id, { status: 'CANCELLED', cancellationReason: 'OTHER' })
    await expect(page.getByText('Votre commande a été annulée')).toBeVisible()
    await expect(page.getByText('Motif :')).toHaveCount(0)
  })

  test('an order the restaurant has not confirmed for 5 minutes invites the customer to call, until it is', async ({
    authenticatedPage: page,
    backend,
  }) => {
    const id = await backend.seedOrder({
      status: 'PENDING',
      online: false,
      withItem: true,
      createdMinutesAgo: 6,
    })
    await page.goto(`/fr/order-completed/${id}`)
    const hint = page.getByText("Votre commande n'a pas encore été confirmée")
    await expect(hint).toBeVisible()
    await expect(hint.locator('a[href^="tel:"]')).toHaveCount(1)
    await listening(backend.mock, id)

    await backend.settleOrder(id, 'CONFIRMED', 'paid')
    await expect(hint).toHaveCount(0)
    await expect(current(page)).toContainText('Confirmé par le restaurant')
  })

  test('an order that cannot be loaded says so instead of spinning for ever', async ({
    authenticatedPage: page,
    backend,
  }) => {
    const id = await backend.seedOrder({ status: 'CONFIRMED', online: false, withItem: true })
    await backend.mock.failOperation('myOrder', { code: 'NOT_FOUND' })
    await page.goto(`/fr/order-completed/${id}`)
    await expect(page.getByText('Impossible de charger les détails de la commande')).toBeVisible()
    await expect(page.getByTestId('order-completed-title')).toHaveCount(0)
    await expect(page.getByTestId('order-completed-verifying')).toHaveCount(0)
    // The way out is still there.
    await expect(page.getByRole('link', { name: 'Voir mes commandes' })).toBeVisible()
    await noHorizontalScroll(page, 'order that failed to load')
  })

  test('placing a cash order and watching the restaurant take it, without a reload', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await backend.mock.user({ phoneNumber: '+32470123456' })
    await fillCart(page, [/Gyoza/u])
    await gotoCheckout(page)
    await chooseCollection(page, 'pickup')
    await choosePayment(page, 'cash')
    await page.getByTestId('cash-acknowledge').check()
    await waitForQuote(page)
    await payButton(page).click()
    await page.waitForURL('**/fr/order-completed/**')
    const [order] = await backend.mock.createdOrders()
    const id = order?.id ?? ''

    // A new order is "received" (a cash order has no payment step to wait for).
    await expect(current(page)).toContainText('Commande reçue')
    await listening(backend.mock, id)
    await backend.mock.patchOrder(id, {
      status: 'CONFIRMED',
      estimatedReadyTime: new Date(Date.now() + 30 * 60_000).toISOString(),
    })
    await expect(current(page)).toContainText('Confirmé par le restaurant')
    await expect(page.getByText('Heure estimée de retrait :')).toBeVisible()
    // The same page, never reloaded: still the one navigation of the checkout.
    expect(page.url()).toContain(id)
  })
})
