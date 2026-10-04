import { expect, test } from './support/test'
import { openAccount, toast } from './support/account'

/*
 * The order history: the "recent orders" widget of /me and the full list /me/orders (pages/me/orders.vue): what each
 * row shows, the detail that opens under it, the invoice download, paging, a failing load with its Retry and the live
 * status updates pushed over the WebSocket. French UI, desktop, both brands (the phone layout is in
 * mobile-account.spec.ts).
 */

test.beforeEach(({ backend }) => {
  test.skip(!backend.isMock, 'needs the mock API')
})

const rows = (page: import('@playwright/test').Page) =>
  page.locator('button[aria-controls^="order-panel-"]')

test.describe('/me/orders', () => {
  test('a customer with no order sees the empty state, not an error', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/fr/me/orders')
    await expect(page.getByText("Vous n'avez pas encore de commande")).toBeVisible()
    await expect(page.getByTestId('orders-load-error')).toHaveCount(0)
  })

  test('lists the orders newest first with their status, date and total', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await backend.seedOrder({
      status: 'PICKED_UP',
      online: true,
      paymentStatus: 'paid',
      withItem: true,
      createdMinutesAgo: 3000,
    })
    await backend.seedOrder({ status: 'CANCELLED', online: false, createdMinutesAgo: 200 })
    await backend.seedOrder({
      status: 'PREPARING',
      online: false,
      withItem: true,
      createdMinutesAgo: 5,
    })

    await page.goto('/fr/me/orders')
    await expect(rows(page)).toHaveCount(3)
    await expect(rows(page).nth(0)).toContainText('En préparation')
    await expect(rows(page).nth(1)).toContainText('Annulée')
    await expect(rows(page).nth(2)).toContainText('Retirée')
    // Pickup, with the order's total: 2 x 12,50 + 0,30 online fee.
    await expect(rows(page).nth(2)).toContainText('À emporter')
    await expect(rows(page).nth(2)).toContainText('25,30')
    // The details are folded until the row is opened.
    await expect(page.getByRole('button', { name: 'Télécharger la facture' })).toBeHidden()
  })

  test('a row opens to its lines and total; only a collected order offers the invoice and reorder', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await backend.seedOrder({
      status: 'PICKED_UP',
      online: true,
      paymentStatus: 'paid',
      withItem: true,
      createdMinutesAgo: 3000,
    })
    await backend.seedOrder({
      status: 'PREPARING',
      online: false,
      withItem: true,
      createdMinutesAgo: 5,
    })
    await page.goto('/fr/me/orders')

    // In progress: the timeline, no invoice.
    await rows(page).nth(0).click()
    const preparing = page.locator('[id^="order-panel-"]').nth(0)
    await expect(preparing).toBeVisible()
    await expect(preparing).toContainText('x2')
    await expect(preparing).toContainText('25,00')
    await expect(preparing.getByRole('button', { name: 'Télécharger la facture' })).toHaveCount(0)

    // Collected: invoice and reorder.
    await rows(page).nth(1).click()
    const collected = page.locator('[id^="order-panel-"]').nth(1)
    await expect(collected.getByRole('button', { name: 'Télécharger la facture' })).toBeVisible()
    await expect(collected.getByRole('button', { name: 'Recommander' })).toBeVisible()

    // A second click folds it again.
    await rows(page).nth(1).click()
    await expect(collected).toBeHidden()
  })

  test('"Recommander" puts the order back in the cart', async ({
    authenticatedPage: page,
    backend,
    brand,
  }) => {
    // A product without choices, so the line can be rebuilt as it was.
    const productId = brand === 'tokyosushi' ? 'p-edamame' : 'p-mochi'
    await backend.seedOrder({ status: 'PICKED_UP', online: false, withItem: true, productId })
    await page.goto('/fr/me/orders')
    await rows(page).first().click()
    await page.getByRole('button', { name: 'Recommander' }).click()
    await expect(toast(page, /articles? ajoutés? au panier|ajouté/u)).toBeVisible()
    const lines = await page.evaluate(
      () =>
        (JSON.parse(localStorage.getItem('cart') ?? '{}') as { products?: { quantity: number }[] })
          .products ?? [],
    )
    expect(lines).toHaveLength(1)
    expect(lines[0]?.quantity).toBe(2)
  })

  test('a cancelled order says why', async ({ authenticatedPage: page, backend }) => {
    const id = await backend.seedOrder({ status: 'PENDING', online: false })
    await backend.mock.settleOrder(id, 'CANCELLED')
    await backend.mock.patchOrder(id, { cancellationReason: 'OUT_OF_STOCK' })
    await page.goto('/fr/me/orders')
    await rows(page).first().click()
    await expect(page.locator('[id^="order-panel-"]').first()).toContainText('Motif')
  })

  test('the invoice of a collected order downloads as a PDF named by the server', async ({
    authenticatedPage: page,
    backend,
  }) => {
    const id = await backend.seedOrder({ status: 'PICKED_UP', online: false, withItem: true })
    await page.goto('/fr/me/orders')
    await rows(page).first().click()
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Télécharger la facture' }).click()
    expect((await download).suggestedFilename()).toBe(`facture-${id.slice(-4)}.pdf`)

    const [call] = await backend.mock.restCalls('/orders/')
    expect(call).toMatchObject({
      method: 'GET',
      path: `/orders/${id}/invoice`,
      authenticated: true,
    })
  })

  test('a failing invoice download tells the customer and downloads nothing', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await backend.seedOrder({ status: 'PICKED_UP', online: false, withItem: true })
    await backend.mock.scenario({ invoiceFailure: true })
    await page.goto('/fr/me/orders')
    await rows(page).first().click()
    let downloaded = false
    page.on('download', () => (downloaded = true))
    await page.getByRole('button', { name: 'Télécharger la facture' }).click()
    await expect(toast(page, 'Le téléchargement de la facture a échoué.')).toBeVisible()
    expect(downloaded).toBe(false)
  })

  test('shows the first 10, then loads the rest on demand', async ({
    authenticatedPage: page,
    backend,
  }) => {
    for (let index = 0; index < 13; index++)
      await backend.seedOrder({
        status: 'PICKED_UP',
        online: false,
        createdMinutesAgo: 1000 + index,
      })
    await page.goto('/fr/me/orders')
    await expect(rows(page)).toHaveCount(10)
    await page.getByRole('button', { name: 'Afficher les 3 dernières' }).click()
    await expect(rows(page)).toHaveCount(13)
    await expect(page.getByRole('button', { name: /Afficher/u })).toHaveCount(0)
  })

  test('a failed load shows its own error with Retry, never "no orders"; Retry recovers', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await backend.seedOrder({ status: 'PICKED_UP', online: false })
    await backend.mock.failOperation('myOrders', { code: 'INTERNAL' })
    await page.goto('/fr/me/orders')
    await expect(page.getByTestId('orders-load-error')).toContainText(
      'Impossible de charger vos commandes',
    )
    await expect(page.getByText("Vous n'avez pas encore de commande")).toHaveCount(0)

    await backend.mock.failOperation('myOrders', null)
    await page.getByTestId('orders-load-error').getByRole('button', { name: 'Réessayer' }).click()
    await expect(rows(page)).toHaveCount(1)
    await expect(page.getByTestId('orders-load-error')).toHaveCount(0)
  })

  test('a status change pushed by the kitchen updates the open page without a reload', async ({
    authenticatedPage: page,
    backend,
  }) => {
    const id = await backend.seedOrder({ status: 'PENDING', online: false })
    await page.goto('/fr/me/orders')
    await expect(rows(page).first()).toContainText('En attente')
    await backend.mock.waitFor((state) => state.subscriptions.includes(`myOrderUpdated:${id}`))

    await backend.mock.settleOrder(id, 'CONFIRMED')
    await expect(rows(page).first()).toContainText('Confirmée')
    await backend.mock.settleOrder(id, 'PICKED_UP')
    await expect(rows(page).first()).toContainText('Retirée')
  })
})

test.describe('recent orders on /me', () => {
  test('the widget shows the recent orders and links to the full list', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await backend.seedOrder({
      status: 'PICKED_UP',
      online: false,
      withItem: true,
      createdMinutesAgo: 900,
    })
    await openAccount(page)
    const widget = page.getByTestId('orders-widget')
    await expect(widget).toContainText('Commandes récentes')
    await expect(widget).toContainText('25,00')
    await widget.getByRole('link', { name: 'Tout voir' }).click()
    await page.waitForURL(/\/fr\/me\/orders/u)
    await expect(rows(page)).toHaveCount(1)
  })

  test('the widget has its own load error with Retry', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await backend.seedOrder({ status: 'PICKED_UP', online: false })
    await backend.mock.failOperation('myOrders', { code: 'INTERNAL' })
    await page.goto('/fr/me')
    await expect(page.getByTestId('orders-widget-load-error')).toBeVisible()
    await backend.mock.failOperation('myOrders', null)
    await page
      .getByTestId('orders-widget-load-error')
      .getByRole('button', { name: 'Réessayer' })
      .click()
    await expect(page.getByTestId('orders-widget-load-error')).toHaveCount(0)
    await expect(page.getByTestId('orders-widget')).toContainText('Retirée')
  })

  test('an order in progress is listed first and expands to its tracking', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await backend.seedOrder({
      status: 'PREPARING',
      online: false,
      withItem: true,
      createdMinutesAgo: 4,
    })
    await page.goto('/fr/me')
    const card = page.locator('[id^="order-card-"]').first()
    await expect(card).toContainText('En préparation')
    // The order being prepared opens by itself, to its tracking; a tap folds it.
    const header = card.getByRole('button').first()
    await expect(header).toHaveAttribute('aria-expanded', 'true')
    await header.click()
    await expect(header).toHaveAttribute('aria-expanded', 'false')
  })
})
