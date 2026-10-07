import type { SeedOrderInput } from './mock/types'
import { expect, test } from './support/test'

/*
 * The "your last order" bar (components/cart/ReorderBar.vue, mounted by each brand layout on the home page and the
 * menu): a signed-in customer with an empty cart gets their last collected or delivered order one tap away. French UI,
 * both brands, desktop (the bar is a card in the corner from `sm` up; on a phone it is full width at the bottom).
 */

test.beforeEach(({ backend }) => {
  test.skip(!backend.isMock, 'needs the mock API')
})

/** A plain product of each brand's mock catalog: a re-order can always rebuild it (no choice to restore). */
const PLAIN = {
  tokyosushi: { id: 'p-edamame', name: 'Edamame' },
  ygfliege: { id: 'p-mochi', name: 'Mochi' },
} as const

/** A collected, paid order of two units of the brand's plain product. */
const collected = (brand: keyof typeof PLAIN): SeedOrderInput => ({
  status: 'PICKED_UP',
  online: true,
  paymentStatus: 'paid',
  items: [{ productId: PLAIN[brand].id, quantity: 2 }],
  createdMinutesAgo: 3000,
})

test.describe('the last order bar', () => {
  test('is not there for a visitor who is not signed in', async ({ page }) => {
    await page.goto('/fr')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('reorder-bar')).toHaveCount(0)
  })

  test('offers the last collected order on the home page and the menu, and orders it again in one tap', async ({
    authenticatedPage: page,
    backend,
    brand,
  }) => {
    await backend.seedOrder(collected(brand))

    await page.goto('/fr')
    const bar = page.getByTestId('reorder-bar')
    await expect(bar).toBeVisible()
    await expect(bar).toContainText('Votre dernière commande')
    await expect(bar.getByTestId('reorder-bar-summary')).toContainText(PLAIN[brand].name)

    await page.goto('/fr/menu')
    await expect(bar).toBeVisible()

    await bar.getByTestId('reorder-bar-button').click()
    await expect(page).toHaveURL(/\/fr\/checkout/u)
    await expect(page.getByTestId('reorder-bar')).toHaveCount(0)
  })

  test('offers nothing while an order is in progress', async ({
    authenticatedPage: page,
    backend,
    brand,
  }) => {
    await backend.seedOrder(collected(brand))
    await backend.seedOrder({
      status: 'PREPARING',
      online: false,
      withItem: true,
      createdMinutesAgo: 5,
    })

    await page.goto('/fr')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('reorder-bar')).toHaveCount(0)
  })

  test('stays closed once closed, after a reload too', async ({
    authenticatedPage: page,
    backend,
    brand,
  }) => {
    await backend.seedOrder(collected(brand))

    await page.goto('/fr')
    const bar = page.getByTestId('reorder-bar')
    await bar.getByTestId('reorder-bar-close').click()
    await expect(bar).toHaveCount(0)

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('reorder-bar')).toHaveCount(0)
  })
})
