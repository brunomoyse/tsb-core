import { type Locator, type Page } from '@playwright/test'
import {
  addPlain,
  cartLines,
  closeCart,
  eurosOf,
  expectNoOverlap,
  gotoMenu,
  inViewport,
  noHorizontalScroll,
  openCart,
  openProductModal,
  pickChoice,
} from './support/order-flow'
import { expect, test } from './support/test'

/*
 * The cart on a phone (Pixel 5: floating bar + sheet), both brands, against the mock tsb-service: adding a product
 * with choices, editing it from the cart, the quantity stepper, removing with Undo, long names at 320 px, the cart
 * surviving a reload, a product that stops being sold, a price that moved, the empty state.
 *
 * Mock mode only: the catalog is the mock's (e2e/mock/catalog) and the scenarios use its control API.
 */

test.skip(({ mock }) => !mock, 'needs the mock tsb-service (catalog and control API)')
test.skip(({ isMobile }) => !isMobile, 'phone layout')

/* What each brand sells that has required choices, and how a customer picks them. */
interface Customised {
  productId: string
  name: string
  /** Picks a valid composition in the modal; returns what the cart line must then hold. */
  compose: (page: Page, modal: Locator) => Promise<void>
  selections: { groupId: string; choiceId: string; quantity: number }[]
  /** Euros of the line for one unit. */
  lineTotal: number
  /** The choice names the cart line spells out. */
  labels: string[]
}

const CUSTOMISED: Record<'tokyosushi' | 'ygfliege', Customised> = {
  tokyosushi: {
    productId: 'p-teriyaki',
    name: 'Poulet teriyaki',
    compose: async (page, modal) => {
      await pickChoice(page, modal, 'product-modal', 'Piquante')
    },
    selections: [{ groupId: 'g-sauce', choiceId: 'ch-piquante', quantity: 1 }],
    lineTotal: 13.4, // 12,90 + 0,50 for the spicy sauce
    labels: ['Piquante'],
  },
  ygfliege: {
    productId: 'p-decouverte',
    name: 'Menu Découverte',
    compose: async (page, modal) => {
      await pickChoice(page, modal, 'product-modal', 'Bouillon tomate mijoté')
      await pickChoice(page, modal, 'product-modal', 'Moyen')
    },
    selections: [
      { groupId: 'g-set-base', choiceId: 'ch-s-tomate', quantity: 1 },
      { groupId: 'g-set-spice', choiceId: 'ch-s-moyen', quantity: 1 },
    ],
    lineTotal: 20.8,
    labels: ['Bouillon tomate mijoté', 'Moyen'],
  },
}

/** A product the customer adds from its card, one per brand. */
const PLAIN = {
  tokyosushi: { id: 'p-edamame', name: 'Edamame', price: 4.5 },
  ygfliege: { id: 'p-mochi', name: 'Mochi', price: 3.9 },
} as const

const line = (sheet: Locator, name: string | RegExp): Locator =>
  sheet.getByTestId('cart-item').filter({ hasText: name })

test.describe('Cart on a phone', () => {
  test('a product with required choices is added with its choices and priced with them', async ({
    page,
    brand,
  }) => {
    const product = CUSTOMISED[brand]
    await gotoMenu(page)
    const modal = await openProductModal(page, product.name)
    const add = modal.getByTestId('product-modal-add-to-cart')

    await test.step('adding with the required choices missing is refused', async () => {
      // TS: the button flags the missing group when tapped. YGF: it stays disabled until the composition is valid.
      if (brand === 'tokyosushi') await add.click()
      else await expect(add).toBeDisabled()
      await expect(modal).toBeVisible()
      expect(await cartLines(page)).toHaveLength(0)
    })

    await test.step('with the choices picked the button shows the line price and adds the line', async () => {
      await product.compose(page, modal)
      await expect(add).toContainText(product.lineTotal.toFixed(2).replace('.', ','))
      await add.click()
      await expect(modal).toBeHidden()
      await expect.poll(async () => (await cartLines(page)).length).toBe(1)
      const [stored] = await cartLines(page)
      expect(stored?.productId).toBe(product.productId)
      expect(stored?.quantity).toBe(1)
      expect(stored?.selections).toEqual(product.selections)
    })

    await test.step('the cart sheet spells out the choices and the line total', async () => {
      const sheet = await openCart(page)
      const item = line(sheet, product.name)
      await expect(item).toHaveCount(1)
      for (const label of product.labels) await expect(item).toContainText(label)
      await expect(item).toContainText(product.lineTotal.toFixed(2).replace('.', ','))
      // A customised line has a fixed "x1" and an Edit button, not a stepper.
      await expect(item.getByTestId('cart-item-quantity')).toHaveText('×1')
      await expect(item.getByTestId('cart-item-edit')).toBeVisible()
      await expect(item.getByTestId('cart-item-increment')).toHaveCount(0)
    })
  })

  test('quantity stepper changes the line total and the stored cart', async ({ page, brand }) => {
    const plain = PLAIN[brand]
    await gotoMenu(page)
    await addPlain(page, plain.name)
    const sheet = await openCart(page)
    const item = line(sheet, plain.name)
    const quantity = item.getByTestId('cart-item-quantity')

    await expect(quantity).toHaveText('1')
    await item.getByTestId('cart-item-increment').click()
    await item.getByTestId('cart-item-increment').click()
    await expect(quantity).toHaveText('3')
    await expect(item).toContainText((plain.price * 3).toFixed(2).replace('.', ','))
    await expect.poll(async () => (await cartLines(page))[0]?.quantity).toBe(3)

    await item.getByTestId('cart-item-decrement').click()
    await expect(quantity).toHaveText('2')
    await expect(item).toContainText((plain.price * 2).toFixed(2).replace('.', ','))
    await expect.poll(async () => (await cartLines(page))[0]?.quantity).toBe(2)
  })

  test('removing a line offers an Undo that puts it back with its choices', async ({
    page,
    brand,
  }) => {
    const product = CUSTOMISED[brand]
    const plain = PLAIN[brand]
    await gotoMenu(page)
    const modal = await openProductModal(page, product.name)
    await product.compose(page, modal)
    await modal.getByTestId('product-modal-add-to-cart').click()
    await expect(modal).toBeHidden()
    await addPlain(page, plain.name)

    const sheet = await openCart(page)
    await expect(sheet.getByTestId('cart-item')).toHaveCount(2)

    await line(sheet, product.name).getByTestId('cart-item-remove').click()
    await expect(sheet.getByTestId('cart-item')).toHaveCount(1)
    await expect(line(sheet, plain.name)).toHaveCount(1)
    await expect
      .poll(async () => (await cartLines(page)).map((l) => l.productId))
      .toEqual([plain.id])

    // The toast names the product and carries the Undo.
    const toast = page.getByRole('status').filter({ hasText: `« ${product.name} » retiré` })
    await expect(toast.first()).toBeVisible()
    await page.getByRole('button', { name: 'Annuler' }).first().click()

    await expect(sheet.getByTestId('cart-item')).toHaveCount(2)
    await expect
      .poll(
        async () =>
          (await cartLines(page)).find((l) => l.productId === product.productId)?.selections,
      )
      .toEqual(product.selections)
  })

  test('the cart survives a reload with its choices and total', async ({ page, brand }) => {
    const product = CUSTOMISED[brand]
    const plain = PLAIN[brand]
    await gotoMenu(page)
    const modal = await openProductModal(page, product.name)
    await product.compose(page, modal)
    await modal.getByTestId('product-modal-add-to-cart').click()
    await expect(modal).toBeHidden()
    await addPlain(page, plain.name)

    let sheet = await openCart(page)
    const totalBefore = eurosOf(await sheet.getByTestId('cart-total').innerText())
    expect(totalBefore).toBeGreaterThan(0)

    await page.reload()
    await expect(page.getByTestId('product-card').first()).toBeVisible()
    sheet = await openCart(page)
    await expect(sheet.getByTestId('cart-item')).toHaveCount(2)
    for (const label of product.labels) await expect(line(sheet, product.name)).toContainText(label)
    await expect
      .poll(async () => eurosOf(await sheet.getByTestId('cart-total').innerText()))
      .toBe(totalBefore)
    expect(
      (await cartLines(page)).find((l) => l.productId === product.productId)?.selections,
    ).toEqual(product.selections)
  })

  test('a multi-choice product keeps the quantity of every choice, priced one by one', async ({
    page,
    brand,
  }) => {
    await gotoMenu(page)
    if (brand === 'tokyosushi') {
      // Bento: one main (+1,50), up to three sides (2 x salad +0,50, edamame +1,00), one drink.
      const modal = await openProductModal(page, 'Bento du chef')
      await pickChoice(page, modal, 'product-modal', 'Bœuf sauté aux oignons nouveaux et gingembre')
      await pickChoice(page, modal, 'product-modal', 'Salade de chou', 2)
      await pickChoice(page, modal, 'product-modal', 'Edamame', 1)
      await pickChoice(page, modal, 'product-modal', 'Eau plate 50cl')
      const add = modal.getByTestId('product-modal-add-to-cart')
      await expect(add).toContainText('22,00') // 18,50 + 1,50 + 2 x 0,50 + 1,00
      // A fourth side is refused: the group is full.
      await expect(modal.getByTestId('product-modal-choice-inc-ch-b-kimchi')).toBeDisabled()
      await add.click()
      await expect(modal).toBeHidden()
      await expect.poll(async () => (await cartLines(page)).length).toBe(1)
      const [stored] = await cartLines(page)
      expect(stored?.productId).toBe('p-bento')
      expect(stored?.selections).toHaveLength(4)
      expect(stored?.selections).toEqual(
        expect.arrayContaining([
          { groupId: 'g-bento-main', choiceId: 'ch-b-boeuf', quantity: 1 },
          { groupId: 'g-bento-sides', choiceId: 'ch-b-salade', quantity: 2 },
          { groupId: 'g-bento-sides', choiceId: 'ch-b-edamame', quantity: 1 },
          { groupId: 'g-bento-drink', choiceId: 'ch-b-eau', quantity: 1 },
        ]),
      )
      const item = line(await openCart(page), 'Bento du chef')
      await expect(item).toContainText('22,00')
      await expect(item).toContainText('Salade de chou')
    } else {
      // Bowl: a broth, five ingredients (broccoli twice: 2 x 1,00), a spice level; 2,50 + 5 x 1,00.
      const composer = page.getByTestId('bowl-composer')
      const cta = page.getByTestId('composer-hero-cta')
      await cta.scrollIntoViewIfNeeded()
      await expect(async () => {
        await cta.click()
        await expect(composer).toBeVisible({ timeout: 2_000 })
      }).toPass({ timeout: 30_000 })
      await pickChoice(page, composer, 'bowl-composer', 'Bouillon tomate mijoté')
      await pickChoice(page, composer, 'bowl-composer', 'Brocoli', 2)
      for (const name of ['Pak choï', 'Épinards', 'Tofu frais'])
        await pickChoice(page, composer, 'bowl-composer', name)
      await pickChoice(page, composer, 'bowl-composer', 'Fort')
      const add = composer.getByTestId('bowl-composer-add-to-cart')
      await expect(add).toBeEnabled()
      await expect(composer.locator('text=/7,50/u').first()).toBeVisible()
      await add.click()
      await expect(composer).toBeHidden()
      await expect.poll(async () => (await cartLines(page)).length).toBe(1)
      const [stored] = await cartLines(page)
      expect(stored?.productId).toBe('p-bowl')
      expect(stored?.selections).toHaveLength(6)
      expect(stored?.selections).toEqual(
        expect.arrayContaining([
          { groupId: 'g-base', choiceId: 'ch-tomate', quantity: 1 },
          { groupId: 'g-ingr', choiceId: 'ch-broc', quantity: 2 },
          { groupId: 'g-ingr', choiceId: 'ch-pak', quantity: 1 },
          { groupId: 'g-ingr', choiceId: 'ch-epi', quantity: 1 },
          { groupId: 'g-ingr', choiceId: 'ch-tofu', quantity: 1 },
          { groupId: 'g-spice', choiceId: 'ch-fort', quantity: 1 },
        ]),
      )
      const item = line(await openCart(page), 'Malatang sur mesure')
      await expect(item).toContainText('7,50')
      await expect(item).toContainText('Brocoli')
    }
  })

  test('Edit on a customised line reopens the product with its choices and replaces the line', async ({
    page,
    brand,
  }) => {
    // Only the TS product modal reads the "line being edited": see the BUG note of the YGF test below.
    test.skip(brand !== 'tokyosushi', 'YGF: covered by the test.fail below')
    await gotoMenu(page)
    const modal = await openProductModal(page, 'Poulet teriyaki')
    await pickChoice(page, modal, 'product-modal', 'Piquante')
    await modal.getByTestId('product-modal-add-to-cart').click()
    await expect(modal).toBeHidden()

    const sheet = await openCart(page)
    await line(sheet, 'Poulet teriyaki').getByTestId('cart-item-edit').click()
    await expect(page).toHaveURL(/\/fr\/menu\?product=p-teriyaki/u)
    await expect(modal).toBeVisible()
    const update = modal.getByTestId('product-modal-add-to-cart')
    // Prefilled with what the line had, offering to update (not to add).
    await expect(update).toContainText('Mettre à jour')
    await expect(update).toContainText('13,40')
    await expect(modal.getByTestId('product-modal-choice-dec-ch-piquante')).toBeEnabled()

    // The sauce group holds one choice: drop the spicy one (+0,50), take the plain teriyaki (no extra).
    await modal.getByTestId('product-modal-choice-dec-ch-piquante').click()
    await modal.getByTestId('product-modal-choice-inc-ch-teriyaki').click()
    await expect(update).toContainText('12,90')
    await update.click()
    await expect(modal).toBeHidden()

    await expect.poll(async () => (await cartLines(page)).length).toBe(1)
    const [stored] = await cartLines(page)
    expect(stored?.selections).toEqual([
      { groupId: 'g-sauce', choiceId: 'ch-teriyaki', quantity: 1 },
    ])
    const edited = line(await openCart(page), 'Poulet teriyaki')
    await expect(edited).toHaveCount(1)
    await expect(edited).toContainText('Teriyaki')
    await expect(edited).toContainText('12,90')
  })

  // BUG (found by this spec): the "Edit" button of a customised line exists on every brand (engine cart), but
  // The YGF ProductModal / BowlComposer never read `useCartItemEdit()`, so the menu opens an EMPTY composer and
  // Confirming ADDS a second line instead of replacing the first. The first assertion below fails today.
  test.fail(
    'YGF: Edit on a customised line reopens the product prefilled and replaces the line',
    async ({ page, brand }) => {
      test.skip(brand !== 'ygfliege', 'TS: covered by the test above')
      await gotoMenu(page)
      const modal = await openProductModal(page, 'Menu Découverte')
      await pickChoice(page, modal, 'product-modal', 'Bouillon tomate mijoté')
      await pickChoice(page, modal, 'product-modal', 'Moyen')
      await modal.getByTestId('product-modal-add-to-cart').click()
      await expect(modal).toBeHidden()

      const sheet = await openCart(page)
      await line(sheet, 'Menu Découverte').getByTestId('cart-item-edit').click()
      await expect(modal).toBeVisible()
      const update = modal.getByTestId('product-modal-add-to-cart')
      // Prefilled and offering an update: the broth and the spice are already picked.
      await expect(update).toBeEnabled()
      await pickChoice(page, modal, 'product-modal', 'Fort') // Replaces the spice level
      await update.click()
      await expect(modal).toBeHidden()
      expect(
        await cartLines(page),
        'editing must replace the line, not add a second one',
      ).toHaveLength(1)
    },
  )

  test('long names and choices at 320 px: nothing scrolls sideways, controls never overlap', async ({
    page,
    brand,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await gotoMenu(page)
    const longName = brand === 'tokyosushi' ? 'Assortiment de sashimis' : 'Thé glacé maison'
    await addPlain(page, longName)
    // A customised line whose choice names are long too.
    if (brand === 'tokyosushi') {
      const modal = await openProductModal(page, 'Bento du chef')
      await pickChoice(
        page,
        modal,
        'product-modal',
        'Saumon grillé sauce teriyaki et riz parfumé au sésame',
      )
      await pickChoice(
        page,
        modal,
        'product-modal',
        'Kimchi maison très long nom pour tester le retour à la ligne',
      )
      await pickChoice(page, modal, 'product-modal', 'Thé vert glacé')
      await modal.getByTestId('product-modal-add-to-cart').click()
      await expect(modal).toBeHidden()
    } else {
      const composer = page.getByTestId('bowl-composer')
      const cta = page.getByTestId('composer-hero-cta')
      await cta.scrollIntoViewIfNeeded()
      await expect(async () => {
        await cta.click()
        await expect(composer).toBeVisible({ timeout: 2_000 })
      }).toPass({ timeout: 30_000 })
      await pickChoice(page, composer, 'bowl-composer', 'Bouillon champignons')
      await pickChoice(
        page,
        composer,
        'bowl-composer',
        'Boulettes de poisson farcies au fromage et à la ciboulette fraîche',
        1,
      )
      for (const name of ['Pak choï', 'Épinards', 'Brocoli', 'Tofu frais'])
        await pickChoice(page, composer, 'bowl-composer', name)
      await pickChoice(page, composer, 'bowl-composer', 'Doux')
      await composer.getByTestId('bowl-composer-add-to-cart').click()
      await expect(composer).toBeHidden()
    }

    const sheet = await openCart(page)
    await expect(sheet.getByTestId('cart-item')).toHaveCount(2)
    await noHorizontalScroll(page, 'cart sheet')
    for (const item of await sheet.getByTestId('cart-item').all()) {
      await inViewport(page, item, 'cart line')
      const quantity = item.getByTestId('cart-item-quantity')
      const remove = item.getByTestId('cart-item-remove')
      await inViewport(page, remove, 'remove button')
      await expectNoOverlap(quantity, remove, 'quantity and remove')
      const edit = item.getByTestId('cart-item-edit')
      if ((await edit.count()) > 0) {
        await inViewport(page, edit, 'edit button')
        await expectNoOverlap(edit, remove, 'edit and remove')
        await expectNoOverlap(quantity, edit, 'quantity and edit')
      } else {
        await expectNoOverlap(
          item.getByTestId('cart-item-decrement'),
          item.getByTestId('cart-item-increment'),
          'stepper',
        )
        await expectNoOverlap(item.getByTestId('cart-item-increment'), remove, 'stepper and remove')
      }
      // The name wraps inside the line instead of being cut by its edge.
      const clipped = await item.evaluate((element) => {
        const box = element.getBoundingClientRect()
        return [...element.querySelectorAll('span, p')].filter(
          (node) => node.getBoundingClientRect().right > box.right + 0.5,
        ).length
      })
      expect(clipped, 'text sticks out of the cart line').toBe(0)
    }
    // The footer keeps the total readable next to its label, and the checkout button inside the screen.
    await inViewport(page, sheet.getByTestId('cart-total'), 'cart total')
    await closeCart(page)
    await page.goto('/fr/cart')
    await expect(page.locator('[data-cart-remove]').first()).toBeVisible()
    await noHorizontalScroll(page, '/cart')
  })

  test('a product that stops being sold is flagged on its line and can be removed', async ({
    page,
    backend,
    brand,
  }) => {
    const plain = PLAIN[brand]
    await gotoMenu(page)
    await addPlain(page, plain.name)
    await backend.mock.product(plain.id, { isAvailable: false })

    await page.reload()
    await expect(page.getByTestId('product-card').first()).toBeVisible()
    const sheet = await openCart(page)
    const issue = sheet.getByTestId('cart-line-issue-PRODUCT_UNAVAILABLE')
    await expect(issue).toBeVisible()
    await expect(issue).toContainText('actuellement indisponible')
    // The way out is to remove the line: it goes with an Undo toast, and the cart is empty again.
    await issue.getByTestId('cart-line-issue-action-remove').click()
    await expect(sheet.getByTestId('cart-item')).toHaveCount(0)
    await expect.poll(async () => (await cartLines(page)).length).toBe(0)
    await expect(page.getByRole('button', { name: 'Annuler' }).first()).toBeVisible()
  })

  test('a price that moved is shown on the line and only charged once accepted', async ({
    page,
    backend,
    brand,
  }) => {
    const plain = PLAIN[brand]
    await gotoMenu(page)
    await addPlain(page, plain.name)
    // The kitchen raises the price while the product sits in the cart.
    await backend.mock.product(plain.id, { price: '5.50' })

    await page.reload()
    await expect(page.getByTestId('product-card').first()).toBeVisible()
    const sheet = await openCart(page)
    const issue = sheet.getByTestId('cart-line-issue-PRICE_CHANGED')
    await expect(issue).toBeVisible()
    await expect(issue).toContainText(
      `${plain.price.toFixed(2).replace('.', ',')} € → 5,50 €`.replace(/ /gu, ' '),
    )
    // The line still shows what the customer saw until they accept.
    await expect(line(sheet, plain.name)).toContainText(plain.price.toFixed(2).replace('.', ','))

    await issue.getByTestId('cart-line-issue-action-accept-price').click()
    await expect(sheet.getByTestId('cart-line-issue-PRICE_CHANGED')).toHaveCount(0)
    await expect(line(sheet, plain.name)).toContainText('5,50')
    // The next quote asks for the accepted total, and the server agrees with it.
    await expect
      .poll(async () => {
        const quotes = await backend.mock.operations('quoteOrder')
        const items = (quotes.at(-1)?.args.input as { items?: { expectedLineTotal: string }[] })
          ?.items
        return items?.[0]?.expectedLineTotal
      })
      .toBe('5.50')
    expect(eurosOf(await sheet.getByTestId('cart-total').innerText())).toBeGreaterThanOrEqual(5.5)
  })

  test('a product pushed as sold out or repriced while the menu is open changes on its card at once', async ({
    page,
    backend,
    brand,
  }) => {
    const plain = PLAIN[brand]
    await gotoMenu(page)
    const card = page.getByTestId('product-card').filter({ hasText: plain.name }).first()
    await card.scrollIntoViewIfNeeded()
    await expect(card.getByTestId('product-add-to-cart')).toBeVisible()
    await backend.mock.waitFor((state) => state.subscriptions.includes('productUpdated'))

    await backend.mock.product(plain.id, { price: '9.99' })
    await expect(card).toContainText('9,99')

    await backend.mock.product(plain.id, { isAvailable: false })
    await expect(card).toContainText('Indisponible')
    await expect(card.getByTestId('product-add-to-cart')).toHaveCount(0)

    await backend.mock.product(plain.id, { isAvailable: true })
    await expect(card.getByTestId('product-add-to-cart')).toBeVisible()
    await addPlain(page, plain.name)
    // The cart line carries the price the customer was shown when adding.
    const sheet = await openCart(page)
    await expect(line(sheet, plain.name)).toContainText('9,99')
  })

  test('an empty cart shows its empty state and no checkout link', async ({ page }) => {
    await page.goto('/fr/cart')
    await expect(page.getByTestId('cart-empty')).toBeVisible()
    await expect(page.getByTestId('cart-checkout-link')).toHaveCount(0)
    await expect(page.getByTestId('floating-cart-bar')).toHaveCount(0)
    await noHorizontalScroll(page, 'empty cart')
  })

  test('the checkout of an empty cart says so and cannot be paid', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await backend.mock.user({ phoneNumber: '+32470123456' })
    await page.goto('/fr/checkout')
    const pay = page.locator('[data-testid="checkout-place-order"]:visible').first()
    await expect(pay).toBeVisible()
    await expect(page.getByText('Votre panier est vide.')).toBeVisible()
    await expect(pay).toBeDisabled()
    expect(await backend.mock.operations('createOrder')).toHaveLength(0)
  })
})
