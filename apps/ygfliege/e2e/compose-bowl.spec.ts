import { type Locator, type Page, expect, test } from '@playwright/test'

// Compose-a-bowl flow against the seeded YGF menu
// (tsb-service/seeds/ygfliege_menu.sql). The "Malatang sur mesure" product has
// three choice groups: base (min 1/max 1), ingredients (min 5/max 20) and
// spice level (min 1/max 1) — the add-to-cart button must stay disabled until
// every group is satisfied.
//
// Composer products open BowlComposer; fixed sets (broth + spice, every group
// min=max=1) stay on ProductModal. Both are driven by the same
// useProductChoices composable, so the gating assertions below cover each.

const choiceRowSelector = (prefix: string) =>
    `[data-testid^="${prefix}-choice-"]:not([data-testid*="-inc-"]):not([data-testid*="-dec-"])`

/** Opens the bowl composer from its hero entry on the menu page. */
const openComposer = async (page: Page): Promise<Locator> => {
    await page.goto('/fr/menu')
    const cta = page.getByTestId('composer-hero-cta')
    await expect(cta).toBeVisible({ timeout: 15_000 })
    const composer = page.getByTestId('bowl-composer')
    // Retry the click: the SSR page is visible before Vue hydration attaches
    // listeners, and a pre-hydration click lands on inert DOM.
    await expect(async () => {
        await cta.click()
        await expect(composer).toBeVisible({ timeout: 2_000 })
    }).toPass({ timeout: 30_000 })
    return composer
}

const openProductModal = async (page: Page, productName: string): Promise<Locator> => {
    await page.goto('/fr/menu')
    const card = page.getByTestId('product-card').filter({ hasText: productName }).first()
    await expect(card).toBeVisible({ timeout: 15_000 })
    const modal = page.getByTestId('product-modal')
    await expect(async () => {
        await card.locator('.cursor-pointer').first().click()
        await expect(modal).toBeVisible({ timeout: 2_000 })
    }).toPass({ timeout: 30_000 })
    return modal
}

/**
 * Selects `choiceName` `times` over. Multi-select rows expose a `+` button;
 * pick-one choices (broth cards, spice chips) are themselves the button, so
 * clicking the row selects it exclusively.
 *
 * Exact-text filter: `hasText` is substring/case-insensitive and e.g. 'Doux'
 * would match the 'Maïs doux' ingredient row before the spice level.
 */
const incrementChoice = async (root: Locator, prefix: string, choiceName: string, times = 1) => {
    const row = root
        .locator(choiceRowSelector(prefix))
        .filter({ has: root.page().getByText(choiceName, { exact: true }) })
        .first()
    await expect(row).toBeVisible()

    const increment = row.locator(`[data-testid^="${prefix}-choice-inc-"]`)
    const isMultiSelect = await increment.count() > 0

    for (let i = 0; i < times; i++) {
        if (isMultiSelect) {
            await increment.click()
        } else {
            await row.click()
        }
    }
}

test.describe('compose a bowl (Malatang sur mesure)', () => {
    test('composes a full bowl and adds it to the cart', async ({ page }) => {
        const composer = await openComposer(page)
        const addButton = composer.getByTestId('bowl-composer-add-to-cart')
        const pick = (name: string, times = 1) => incrementChoice(composer, 'bowl-composer', name, times)

        // Nothing selected yet → all three groups unsatisfied.
        await expect(addButton).toBeDisabled()

        // Base: one broth (min 1 / max 1).
        await pick('Bouillon tomate mijoté')
        await expect(addButton).toBeDisabled()

        // Ingredients: five picks across the catalogue (min 5).
        await pick('Pak choï')
        await pick('Épinards')
        await pick('Brocoli')
        await pick('Tofu frais')
        await expect(addButton).toBeDisabled()
        await pick('Nouilles udon')

        // Spice level still missing.
        await expect(addButton).toBeDisabled()
        await pick('Moyen')

        // Base €2.50 + 4 × €1.00 vegetables + €1.20 noodles = €7.70.
        await expect(composer.locator('text=/7,70/').first()).toBeVisible()
        await expect(addButton).toBeEnabled()
        await addButton.click()
        await expect(composer).toBeHidden()

        // The cart line carries the product and its selections.
        const cartItem = page.getByTestId('side-cart').getByTestId('cart-item').filter({ hasText: 'Malatang sur mesure' })
        await expect(cartItem).toBeVisible()
        await expect(cartItem).toContainText('Bouillon tomate mijoté')
        await expect(cartItem).toContainText('Pak choï')
        await expect(cartItem).toContainText('Nouilles udon')
        await expect(cartItem).toContainText('Moyen')
    })

    test('keeps add-to-cart disabled below the 5-ingredient minimum', async ({ page }) => {
        const composer = await openComposer(page)
        const addButton = composer.getByTestId('bowl-composer-add-to-cart')
        const pick = (name: string, times = 1) => incrementChoice(composer, 'bowl-composer', name, times)

        await pick('Bouillon champignons')
        await pick('Doux')
        await pick('Maïs doux')
        await pick('Crevettes')

        // Only 2 of 5 required ingredients → still disabled.
        await expect(addButton).toBeDisabled()

        // Topping up the same ingredient counts toward the minimum.
        await pick('Crevettes', 3)
        await expect(addButton).toBeEnabled()
    })

    test('fixed set requires broth and spice level', async ({ page }) => {
        const modal = await openProductModal(page, 'Menu Découverte')
        const addButton = modal.getByTestId('product-modal-add-to-cart')
        const pick = (name: string, times = 1) => incrementChoice(modal, 'product-modal', name, times)

        await expect(addButton).toBeDisabled()
        await pick("Bouillon d'os de bœuf épicé")
        await expect(addButton).toBeDisabled()
        await pick('Fort')

        // Fixed set price, no modifiers.
        await expect(modal.locator('text=/20,80/').first()).toBeVisible()
        await expect(addButton).toBeEnabled()
        await addButton.click()

        const cartItem = page.getByTestId('side-cart').getByTestId('cart-item').filter({ hasText: 'Menu Découverte' })
        await expect(cartItem).toBeVisible()
        await expect(cartItem).toContainText("Bouillon d'os de bœuf épicé")
        await expect(cartItem).toContainText('Fort')
    })
})
