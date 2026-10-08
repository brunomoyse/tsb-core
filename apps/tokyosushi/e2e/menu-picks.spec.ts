import type { SeedOrderInput } from '../../../layers/engine/e2e/mock/types'
import {
  dismissCookieConsent,
  waitForNuxtHydration,
} from '../../../layers/engine/e2e/support/hydration'
import { expect, test } from '../../../layers/engine/e2e/support/test'

/*
 * The row at the top of the menu (engine components/menu/MenuPicksRow.vue, utils/menuPicks.ts): the most ordered
 * products for a visitor, the customer's own once they have ordered. French UI, desktop, mock API (the counts come
 * from the scenario and the seeded orders).
 */

test.beforeEach(({ backend }) => {
  test.skip(!backend.isMock, 'needs the mock API')
})

const POPULAR = [
  { productId: 'p-teriyaki', orderCount: 40 },
  { productId: 'p-toro', orderCount: 35 }, // sold out in the mock catalog: never shown
  { productId: 'p-edamame', orderCount: 30 },
  { productId: 'p-mochi', orderCount: 20 },
]

/** A collected, paid order of these plain products, two days ago. */
const collected = (...productIds: string[]): SeedOrderInput => ({
  status: 'PICKED_UP',
  online: true,
  paymentStatus: 'paid',
  items: productIds.map((productId) => ({ productId, quantity: 1 })),
  createdMinutesAgo: 3000,
})

test.describe('the row at the top of the menu', () => {
  test('shows a visitor the most ordered products on sale, in the server HTML, not while searching', async ({
    page,
    backend,
  }) => {
    await backend.mock.scenario({ popularProducts: POPULAR })

    // Rendered by the server: the row is there before any script runs, so nothing below it moves.
    const html = await (await page.request.get('/fr/menu')).text()
    expect(html).toContain('data-testid="menu-picks"')

    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)
    const row = page.getByTestId('menu-picks')
    await expect(row).toHaveAttribute('data-kind', 'popular')
    await expect(row.getByRole('heading', { name: 'Les plus commandés' })).toBeVisible()
    const cards = row.getByTestId('menu-picks-card')
    await expect(cards).toHaveCount(3)
    await expect(cards.nth(0)).toContainText('Poulet teriyaki')
    await expect(cards.nth(1)).toContainText('Edamame')
    await expect(row).not.toContainText('Toro')

    // The products stay in their categories too.
    await expect(
      page.getByTestId('product-card').filter({ hasText: 'Poulet teriyaki' }),
    ).toHaveCount(1)

    await page.locator('#menuSearch').fill('edamame')
    await expect(page.getByTestId('menu-picks')).toHaveCount(0)
    await page.locator('#menuSearch').fill('')
    await expect(page.getByTestId('menu-picks')).toBeVisible()
  })

  test('shows no row when there are not two products to show', async ({ page, backend }) => {
    await backend.mock.scenario({ popularProducts: [{ productId: 'p-edamame', orderCount: 3 }] })
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await expect(page.getByTestId('product-card').first()).toBeVisible()
    await expect(page.getByTestId('menu-picks')).toHaveCount(0)
  })

  test('shows a returning customer their own products: "Déjà commandés", then "Vos favoris"', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await backend.mock.scenario({ popularProducts: POPULAR })
    await backend.seedOrder(collected('p-miso', 'p-cola'))

    await page.goto('/fr/menu')
    const row = page.getByTestId('menu-picks')
    await expect(row).toHaveAttribute('data-kind', 'ordered')
    await expect(row.getByRole('heading', { name: 'Déjà commandés' })).toBeVisible()
    await expect(row.getByTestId('menu-picks-card')).toHaveCount(2)
    await expect(row).toContainText('Soupe miso')
    await expect(row).not.toContainText('Poulet teriyaki')

    // Ordered a second time: a favourite, first in the row.
    await backend.seedOrder(collected('p-cola'))
    await page.reload()
    await expect(row).toHaveAttribute('data-kind', 'favorites')
    await expect(row.getByRole('heading', { name: 'Vos favoris' })).toBeVisible()
    await expect(row.getByTestId('menu-picks-card').first()).toContainText('Coca')
  })

  test('adds a product to the cart from the row', async ({ page, backend }) => {
    await backend.mock.scenario({ popularProducts: POPULAR })
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)

    const edamame = page
      .getByTestId('menu-picks')
      .getByTestId('menu-picks-card')
      .filter({ hasText: 'Edamame' })
    await edamame.getByTestId('product-add-to-cart').click()
    await expect(page.getByTestId('side-cart')).toContainText('Edamame')
  })
})
