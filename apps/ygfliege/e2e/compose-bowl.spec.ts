import { type Locator, type Page, expect, test } from '@playwright/test'

// Compose-a-bowl flow against the seeded YGF menu
// (tsb-service/seeds/ygfliege_menu.sql). The "Malatang sur mesure" product has
// three choice groups: base (min 1/max 1), ingredients (min 5/max 20) and
// spice level (min 1/max 1) — the add-to-cart button must stay disabled until
// every group is satisfied.

const openProductModal = async (page: Page, productName: string): Promise<Locator> => {
    await page.goto('/fr/menu')
    const card = page.getByTestId('product-card').filter({ hasText: productName }).first()
    await expect(card).toBeVisible()
    // Clicking the card image/body opens the modal for products with choices.
    await card.locator('.cursor-pointer').first().click()
    const modal = page.getByTestId('product-modal')
    await expect(modal).toBeVisible()
    return modal
}

const incrementChoice = async (modal: Locator, choiceName: string, times = 1) => {
    const row = modal
        .locator('[data-testid^="product-modal-choice-"]:not([data-testid*="-inc-"]):not([data-testid*="-dec-"])')
        .filter({ hasText: choiceName })
        .first()
    await expect(row).toBeVisible()
    for (let i = 0; i < times; i++) {
        await row.locator('[data-testid^="product-modal-choice-inc-"]').click()
    }
}

test.describe('compose a bowl (Malatang sur mesure)', () => {
    test('composes a full bowl and adds it to the cart', async ({ page }) => {
        const modal = await openProductModal(page, 'Malatang sur mesure')
        const addButton = modal.getByTestId('product-modal-add-to-cart')

        // Nothing selected yet → all three groups unsatisfied.
        await expect(addButton).toBeDisabled()

        // Base: one broth (min 1 / max 1).
        await incrementChoice(modal, 'Bouillon tomate mijoté')
        await expect(addButton).toBeDisabled()

        // Ingredients: five picks across the catalogue (min 5).
        await incrementChoice(modal, 'Pak choï')
        await incrementChoice(modal, 'Épinards')
        await incrementChoice(modal, 'Brocoli')
        await incrementChoice(modal, 'Tofu frais')
        await expect(addButton).toBeDisabled()
        await incrementChoice(modal, 'Nouilles udon')

        // Spice level still missing.
        await expect(addButton).toBeDisabled()
        await incrementChoice(modal, 'Moyen')

        // Base €2.50 + 4 × €1.00 vegetables + €1.20 noodles = €7.70.
        await expect(modal.locator('text=/7,70/').first()).toBeVisible()
        await expect(addButton).toBeEnabled()
        await addButton.click()
        await expect(modal).toBeHidden()

        // The cart line carries the product and its selections.
        const cartItem = page.getByTestId('side-cart').getByTestId('cart-item').filter({ hasText: 'Malatang sur mesure' })
        await expect(cartItem).toBeVisible()
        await expect(cartItem).toContainText('Bouillon tomate mijoté')
        await expect(cartItem).toContainText('Pak choï')
        await expect(cartItem).toContainText('Nouilles udon')
        await expect(cartItem).toContainText('Moyen')
    })

    test('keeps add-to-cart disabled below the 5-ingredient minimum', async ({ page }) => {
        const modal = await openProductModal(page, 'Malatang sur mesure')
        const addButton = modal.getByTestId('product-modal-add-to-cart')

        await incrementChoice(modal, 'Bouillon champignons')
        await incrementChoice(modal, 'Doux')
        await incrementChoice(modal, 'Maïs doux')
        await incrementChoice(modal, 'Crevettes')

        // Only 2 of 5 required ingredients → still disabled.
        await expect(addButton).toBeDisabled()

        // Topping up the same ingredient counts toward the minimum.
        await incrementChoice(modal, 'Crevettes', 3)
        await expect(addButton).toBeEnabled()
    })

    test('fixed set requires broth and spice level', async ({ page }) => {
        const modal = await openProductModal(page, 'Menu Découverte')
        const addButton = modal.getByTestId('product-modal-add-to-cart')

        await expect(addButton).toBeDisabled()
        await incrementChoice(modal, "Bouillon d'os de bœuf épicé")
        await expect(addButton).toBeDisabled()
        await incrementChoice(modal, 'Fort')

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
