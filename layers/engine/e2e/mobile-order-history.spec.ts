import { type Locator, type Page } from '@playwright/test'
import type { MockControl } from './mock/client'
import type { SeedOrderInput } from './mock/types'
import { cartLines, fillCart, gotoMenu, noHorizontalScroll } from './support/order-flow'
import { expect, test } from './support/test'

/*
 * The order history on a phone (/me/orders), both brands: orders that are still in progress change status live, and a
 * finished order can be ordered again: into an empty cart straight away, into a cart that has lines after a
 * Replace / Add / Cancel prompt, with the choices of a customised line kept, and with the lines that cannot be restored
 * left out and named.
 */

test.skip(({ mock }) => !mock, 'needs the mock tsb-service (seeded orders, live updates)')
test.skip(({ isMobile }) => !isMobile, 'phone layout')

/** What each brand's history is built from: a plain product and a customised one, as the mock catalog has them. */
const MENU = {
  tokyosushi: {
    plain: { id: 'p-edamame', name: 'Edamame' },
    custom: {
      id: 'p-teriyaki',
      name: 'Poulet teriyaki',
      selections: [{ groupId: 'g-sauce', choiceId: 'ch-piquante', quantity: 1 }],
    },
  },
  ygfliege: {
    plain: { id: 'p-mochi', name: 'Mochi' },
    custom: {
      id: 'p-decouverte',
      name: 'Menu Découverte',
      selections: [
        { groupId: 'g-set-base', choiceId: 'ch-s-tomate', quantity: 1 },
        { groupId: 'g-set-spice', choiceId: 'ch-s-moyen', quantity: 1 },
      ],
    },
  },
} as const

const card = (page: Page, id: string): Locator => page.locator(`#order-card-${id}`)

/** Opens /fr/me/orders and expands one order. */
async function openOrder(page: Page, id: string): Promise<Locator> {
  await page.goto('/fr/me/orders')
  const order = card(page, id)
  await expect(order).toBeVisible()
  await order.getByRole('button', { expanded: false }).first().click()
  await expect(page.locator(`#order-panel-${id}`)).toBeVisible()
  return order
}

const seed = (mock: MockControl, input: Partial<SeedOrderInput>) =>
  mock.seedOrder({ status: 'PICKED_UP', online: false, ...input })

test.describe('Orders in progress', () => {
  test('the status of an order in the list follows the kitchen, and a finished one offers to order again', async ({
    authenticatedPage: page,
    backend,
    brand,
  }) => {
    const menu = MENU[brand]
    const id = await seed(backend.mock, {
      status: 'PENDING',
      items: [{ productId: menu.plain.id, quantity: 1 }],
    })
    await page.goto('/fr/me/orders')
    const order = card(page, id)
    await expect(order).toBeVisible()
    // An order in progress is a badge with its status, and nothing to re-order yet.
    await expect(order.getByText('En attente', { exact: true })).toBeVisible()
    await backend.mock.waitFor((state) => state.subscriptions.includes(`myOrderUpdated:${id}`))
    await order.getByRole('button', { expanded: false }).first().click()
    await expect(order.getByRole('list', { name: 'Suivi de la commande' })).toContainText(
      'Commande reçue',
    )
    await expect(order.getByRole('button', { name: 'Recommander' })).toHaveCount(0)

    await backend.settleOrder(id, 'CONFIRMED', 'paid')
    await expect(order.getByText('Confirmé', { exact: true })).toBeVisible()
    await backend.settleOrder(id, 'PREPARING', 'paid')
    await expect(order.getByText('En préparation', { exact: true })).toBeVisible()
    await expect(
      order.getByRole('list', { name: 'Suivi de la commande' }).locator('[aria-current="step"]'),
    ).toContainText('Préparation')

    // Done: the live timeline goes, and the order can be ordered again.
    await backend.settleOrder(id, 'PICKED_UP', 'paid')
    await expect(order.getByText('Retiré', { exact: true })).toBeVisible()
    await expect(order.getByRole('list', { name: 'Suivi de la commande' })).toHaveCount(0)
    await expect(order.getByRole('button', { name: 'Recommander' })).toBeVisible()
    await noHorizontalScroll(page, 'order list')
  })

  test('a cancelled order shows its reason and cannot be ordered again from the list', async ({
    authenticatedPage: page,
    backend,
    brand,
  }) => {
    const id = await seed(backend.mock, {
      status: 'PREPARING',
      items: [{ productId: MENU[brand].plain.id, quantity: 1 }],
    })
    const order = await openOrder(page, id)
    await backend.mock.waitFor((state) => state.subscriptions.includes(`myOrderUpdated:${id}`))
    await backend.mock.patchOrder(id, { status: 'CANCELLED', cancellationReason: 'KITCHEN_CLOSED' })
    await expect(order.getByText('Annulé', { exact: true })).toBeVisible()
    await expect(order.getByText('Cuisine fermée')).toBeVisible()
    await expect(order.getByRole('button', { name: 'Recommander' })).toHaveCount(0)
  })
})

test.describe('Ordering again', () => {
  test('into an empty cart: the lines come back with their quantity and choices, and the checkout opens', async ({
    authenticatedPage: page,
    backend,
    brand,
  }) => {
    const menu = MENU[brand]
    const id = await seed(backend.mock, {
      items: [
        { productId: menu.plain.id, quantity: 2 },
        { productId: menu.custom.id, quantity: 1, selections: [...menu.custom.selections] },
      ],
    })
    const order = await openOrder(page, id)
    await order.getByRole('button', { name: 'Recommander' }).click()

    await page.waitForURL('**/fr/checkout')
    await expect(page.getByText('3 articles ajoutés au panier').first()).toBeVisible()
    const lines = await cartLines(page)
    expect(lines).toHaveLength(2)
    expect(lines.find((line) => line.productId === menu.plain.id)?.quantity).toBe(2)
    const custom = lines.find((line) => line.productId === menu.custom.id)
    expect(custom?.quantity).toBe(1)
    expect(custom?.selections).toEqual(menu.custom.selections)
    // The checkout shows the same basket.
    await expect(page.getByText(menu.custom.name).first()).toBeVisible()
  })

  test('into a cart that has lines: Cancel changes nothing, Replace swaps the basket, Add merges into it', async ({
    authenticatedPage: page,
    backend,
    brand,
  }) => {
    const menu = MENU[brand]
    const id = await seed(backend.mock, { items: [{ productId: menu.plain.id, quantity: 2 }] })
    // The cart already holds one of the same product and a gyoza.
    await fillCart(page, [menu.plain.name, /Gyoza/u])
    expect(await cartLines(page)).toHaveLength(2)

    const reorder = async () => {
      const order = await openOrder(page, id)
      await order.getByRole('button', { name: 'Recommander' }).click()
      const dialog = page.getByTestId('reorder-dialog')
      await expect(dialog).toContainText('Remplacer votre panier actuel ?')
      return dialog
    }

    await test.step('Cancel: the cart is untouched', async () => {
      const dialog = await reorder()
      await dialog.getByTestId('reorder-cancel').click()
      await expect(dialog).toBeHidden()
      await expect(page).toHaveURL(/\/fr\/me\/orders/u)
      expect(await cartLines(page)).toHaveLength(2)
    })

    await test.step('Add: the order is merged, quantities of the same product add up', async () => {
      const dialog = await reorder()
      await dialog.getByTestId('reorder-merge').click()
      await page.waitForURL('**/fr/checkout')
      const lines = await cartLines(page)
      expect(lines).toHaveLength(2)
      expect(lines.find((line) => line.productId === menu.plain.id)?.quantity).toBe(3) // 1 + 2
    })

    await test.step('Replace: only the re-ordered lines remain', async () => {
      const dialog = await reorder()
      await dialog.getByTestId('reorder-replace').click()
      await page.waitForURL('**/fr/checkout')
      const lines = await cartLines(page)
      expect(lines).toHaveLength(1)
      expect(lines[0]).toMatchObject({ productId: menu.plain.id, quantity: 2 })
    })
  })

  test('a line whose product is no longer sold is left out and named; the others are added', async ({
    authenticatedPage: page,
    backend,
    brand,
  }) => {
    const menu = MENU[brand]
    const id = await seed(backend.mock, {
      items: [
        { productId: menu.plain.id, quantity: 1 },
        { productId: menu.custom.id, quantity: 1, selections: [...menu.custom.selections] },
      ],
    })
    await backend.mock.product(menu.custom.id, { isAvailable: false })
    const order = await openOrder(page, id)
    await order.getByRole('button', { name: 'Recommander' }).click()

    await page.waitForURL('**/fr/checkout')
    await expect(
      page.getByText(`Non ajoutés : ${menu.custom.name} (indisponible)`).first(),
    ).toBeVisible()
    const lines = await cartLines(page)
    expect(lines.map((line) => line.productId)).toEqual([menu.plain.id])
  })

  test('an order of products that are all gone adds nothing and says so', async ({
    authenticatedPage: page,
    backend,
    brand,
  }) => {
    const menu = MENU[brand]
    const id = await seed(backend.mock, { items: [{ productId: menu.plain.id, quantity: 1 }] })
    await backend.mock.product(menu.plain.id, { isAvailable: false })
    const order = await openOrder(page, id)
    await order.getByRole('button', { name: 'Recommander' }).click()
    await expect(page.getByText(/Rien n.a pu être recommandé/u).first()).toBeVisible()
    await expect(page).toHaveURL(/\/fr\/me\/orders/u)
    expect(await cartLines(page)).toHaveLength(0)
    // The menu was not touched either.
    await gotoMenu(page)
    await expect(page.getByTestId('floating-cart-bar')).toHaveCount(0)
  })
})
