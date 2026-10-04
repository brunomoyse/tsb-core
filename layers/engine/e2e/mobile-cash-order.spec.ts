import { type Locator, type Page } from '@playwright/test'
import { expect, test } from './support/test'
import { collectBrowserProblems } from './support/browser-problems'

/*
 * The cash-order smoke flow on a phone, both brands, against the mock tsb-service (the former smoke.mjs harness).
 *
 * One test on purpose: it is the story of one customer (menu, product with choices, cart, checkout, cash, order
 * confirmation) and every step builds on the previous one. Each `test.step` asserts one thing, so a failure names it.
 * Along the way it checks the layout rules that only break on a narrow screen: nothing scrolls sideways, long product
 * names stay inside the viewport, the pay bar keeps the total readable while the quote is slow. The last step fails the
 * run when the browser reported a page error, a console error or a failed request.
 *
 * Mock mode only: it needs the mock's control API (a failing quote, a slow quote) and creates a real order. Selectors are
 * the apps' data-testids where they exist; /cart has none on its lines, so it is driven through accessible names (French).
 */

const money = (text: string | null): number =>
  Number((text ?? '').replace(/[^\d,]/gu, '').replace(',', '.'))

/** The persisted cart (utils/cartPersistence.ts, version 2) as `{ productId, quantity, selections }` lines. */
const cartLines = (page: Page) =>
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

const noHorizontalScroll = async (page: Page, label: string) => {
  const widths = await page.evaluate(() => ({
    scroll: document.scrollingElement?.scrollWidth ?? 0,
    inner: window.innerWidth,
  }))
  expect(widths.scroll, `${label}: the page scrolls sideways`).toBeLessThanOrEqual(widths.inner)
}

const inViewport = async (page: Page, locator: Locator, label: string) => {
  const box = await locator.boundingBox()
  const width = page.viewportSize()?.width ?? 0
  expect(box, `${label}: not rendered`).not.toBeNull()
  expect(box?.x ?? 0, `${label}: starts left of the viewport`).toBeGreaterThanOrEqual(-0.5)
  expect(
    (box?.x ?? 0) + (box?.width ?? 0),
    `${label}: ends right of the viewport`,
  ).toBeLessThanOrEqual(width + 0.5)
}

/** Multi-select rows have a "+"; pick-one rows are themselves the button. */
async function pick(page: Page, root: Locator, prefix: string, name: string, times = 1) {
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

test.describe('Cash order on a phone', () => {
  test('menu, cart, checkout, cash payment and confirmation', async ({
    authenticatedPage: page,
    backend,
    brand,
  }, testInfo) => {
    test.skip(!backend.isMock, 'needs the mock tsb-service (control API and a created order)')
    test.skip(!testInfo.project.use.isMobile, 'phone layout flow')
    test.setTimeout(120_000)
    const problems = collectBrowserProblems(page)
    const isTokyo = brand === 'tokyosushi'
    const complexProductId = isTokyo ? 'p-teriyaki' : 'p-bowl'
    const plainProductId = isTokyo ? 'p-edamame' : 'p-mochi'
    const plainName = isTokyo ? 'Edamame' : 'Mochi'
    const cartSheet = page.getByTestId('cart-mobile')
    const payButton = page.locator('[data-testid="checkout-place-order"]:visible').first()

    const goto = async (path: string) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
    }
    const openSheet = async () => {
      if (await cartSheet.isVisible().catch(() => false)) return
      await page.getByTestId('floating-cart-bar').click()
      await expect(cartSheet).toBeVisible()
      // The sheet slides up: wait until it stops moving before asserting positions.
      let last = -1
      await expect
        .poll(
          async () => {
            const y = (await cartSheet.boundingBox())?.y ?? -2
            const settled = y === last
            last = y
            return settled
          },
          { intervals: [150] },
        )
        .toBe(true)
    }

    await test.step('menu renders and a very long product name fits', async () => {
      await goto('/fr/menu')
      await expect(page.getByTestId('product-card').first()).toBeVisible()
      await noHorizontalScroll(page, 'menu')
      const long = page
        .getByTestId('product-card')
        .filter({ hasText: isTokyo ? 'Assortiment de sashimis' : 'Thé glacé maison' })
        .first()
      await long.scrollIntoViewIfNeeded()
      await inViewport(page, long, 'long-name card')
      await inViewport(page, long.getByTestId('product-name'), 'long product name')
      expect(await long.innerText()).toMatch(/\d+,\d{2}\s*€/u)
    })

    if (isTokyo) {
      const card = page.getByTestId('product-card').filter({ hasText: 'Poulet teriyaki' }).first()
      const modal = page.getByTestId('product-modal')
      await test.step('a product with a required choice: a missing sauce blocks the add', async () => {
        await card.scrollIntoViewIfNeeded()
        await card.getByTestId('product-name').click()
        await expect(modal).toBeVisible()
        const add = modal.getByTestId('product-modal-add-to-cart')
        // Tapping Add with the sauce missing flags the group instead of adding.
        await add.click()
        await expect(modal).toBeVisible()
        expect(await cartLines(page), 'a line was added without the required sauce').toHaveLength(0)
        // The stepper of a priced choice stays inside its row.
        for (const id of ['ch-teriyaki', 'ch-piquante']) {
          const row = await modal.getByTestId(`product-modal-choice-${id}`).boundingBox()
          const inc = await modal.getByTestId(`product-modal-choice-inc-${id}`).boundingBox()
          expect(
            (inc?.x ?? 0) + (inc?.width ?? 0),
            `stepper of ${id} sticks out of its row`,
          ).toBeLessThanOrEqual((row?.x ?? 0) + (row?.width ?? 0) + 0.5)
        }
        // A single word is never broken in the middle ("Piquant / e").
        const name = await modal
          .getByTestId('product-modal-choice-ch-piquante')
          .getByText('Piquante', { exact: true })
          .boundingBox()
        expect(name?.height ?? 99, 'option name wrapped mid-word').toBeLessThan(26)
        await modal.getByTestId('product-modal-choice-inc-ch-piquante').click()
        await expect(add).toBeEnabled()
        await expect(add).toContainText('13,40')
      })
      await test.step('add the product with its choice, then a plain product', async () => {
        await modal.getByTestId('product-modal-add-to-cart').click()
        await expect(modal).toBeHidden()
        await expect(page.getByTestId('floating-cart-bar')).toBeVisible()
        const edamame = page.getByTestId('product-card').filter({ hasText: 'Edamame' }).first()
        await edamame.scrollIntoViewIfNeeded()
        await edamame.getByTestId('product-add-to-cart').click()
        await expect.poll(async () => (await cartLines(page)).length).toBe(2)
        const teriyaki = (await cartLines(page)).find((line) => line.productId === 'p-teriyaki')
        expect(teriyaki?.selections).toEqual([
          { groupId: 'g-sauce', choiceId: 'ch-piquante', quantity: 1 },
        ])
      })
    } else {
      const composer = page.getByTestId('bowl-composer')
      await test.step('bowl composer: gated until broth, 5 ingredients and spice are picked', async () => {
        const cta = page.getByTestId('composer-hero-cta')
        await cta.scrollIntoViewIfNeeded()
        // A click before hydration lands on inert markup: retry until the composer opens.
        await expect(async () => {
          await cta.click()
          await expect(composer).toBeVisible({ timeout: 2_000 })
        }).toPass({ timeout: 30_000 })
        const add = composer.getByTestId('bowl-composer-add-to-cart')
        await expect(add).toBeDisabled()
        await pick(page, composer, 'bowl-composer', 'Bouillon tomate mijoté')
        for (const ingredient of ['Pak choï', 'Épinards', 'Brocoli', 'Tofu frais'])
          await pick(page, composer, 'bowl-composer', ingredient)
        await expect(add).toBeDisabled() // 4 of 5 ingredients, no spice
        await pick(page, composer, 'bowl-composer', 'Nouilles udon')
        await expect(add).toBeDisabled() // Spice still missing
        await pick(page, composer, 'bowl-composer', 'Moyen')
        await expect(add).toBeEnabled()
        // 2,50 base + 4 x 1,00 + 1,20 udon
        await expect(composer.locator('text=/7,70/u').first()).toBeVisible()
      })
      await test.step('add the bowl, then a plain product', async () => {
        await composer.getByTestId('bowl-composer-add-to-cart').click()
        await expect(composer).toBeHidden()
        await expect(page.getByTestId('floating-cart-bar')).toBeVisible()
        const mochi = page.getByTestId('product-card').filter({ hasText: 'Mochi' }).first()
        await mochi.scrollIntoViewIfNeeded()
        await mochi.getByTestId('product-add-to-cart').click()
        await expect.poll(async () => (await cartLines(page)).length).toBe(2)
        const bowl = (await cartLines(page)).find((line) => line.productId === 'p-bowl')
        const picked = (bowl?.selections as { quantity: number }[] | undefined)?.reduce(
          (n, s) => n + s.quantity,
          0,
        )
        expect(picked).toBe(7) // 1 broth + 5 ingredients + 1 spice
      })
    }

    await test.step('the cart sheet lists both lines with a total', async () => {
      await openSheet()
      await expect(cartSheet.getByTestId('cart-item')).toHaveCount(2)
      await expect(cartSheet.getByTestId('cart-total')).toContainText('€')
      await noHorizontalScroll(page, 'cart sheet')
    })

    await test.step('/cart: quantity, remove and undo', async () => {
      await goto('/fr/cart')
      const removeButtons = page.locator('[data-cart-remove]')
      await expect(removeButtons).toHaveCount(2)
      const line = page.locator('div.touch-pan-y').filter({
        has: page.getByRole('button', { name: new RegExp(`Retirer « ${plainName}`, 'u') }),
      })
      const quantity = line.locator('span.tabular-nums.select-none')
      await expect(quantity).toHaveText('1')
      // The price column must not spill into the stepper: it is a min-w-0 flex child, wider text overlaps.
      for (const card of await page.locator('div.touch-pan-y').all()) {
        const spill = await card.evaluate((element) => {
          const price = [...element.querySelectorAll('span')].find(
            (span) =>
              /\d,\d{2}\s*€/u.test(span.textContent ?? '') && span.className.includes('font-bold'),
          )
          const column = price?.parentElement
          return column ? column.scrollWidth - column.clientWidth : 0
        })
        expect(
          spill,
          'the line price is wider than its column and overlaps the stepper',
        ).toBeLessThanOrEqual(0)
      }
      const before = money(await page.getByTestId('cart-page-total').innerText())
      await line
        .getByRole('button', { name: new RegExp(`Augmenter la quantité de ${plainName}`, 'u') })
        .click()
      await expect(quantity).toHaveText('2')
      expect(
        money(await page.getByTestId('cart-page-total').innerText()),
        'the total must grow with the quantity',
      ).toBeGreaterThan(before)
      await line
        .getByRole('button', { name: new RegExp(`Diminuer la quantité de ${plainName}`, 'u') })
        .click()
      await expect(quantity).toHaveText('1')
      // Remove, then Undo from the toast: the line is back.
      await line.getByRole('button', { name: new RegExp(`Retirer « ${plainName}`, 'u') }).click()
      await expect(removeButtons).toHaveCount(1)
      await expect.poll(async () => (await cartLines(page)).length).toBe(1)
      await page.getByRole('button', { name: 'Annuler' }).first().click()
      await expect(removeButtons).toHaveCount(2)
      await expect
        .poll(async () => (await cartLines(page)).map((l) => l.productId).sort())
        .toEqual([complexProductId, plainProductId].sort())
      await noHorizontalScroll(page, '/cart')
    })

    if (isTokyo) {
      await test.step('/cart: delivery below the minimum warns and blocks, even when the quote fails', async () => {
        await backend.mock.scenario({ quoteFailure: { code: 'INTERNAL' } })
        await goto('/fr/cart')
        await expect(page.locator('[data-cart-remove]').first()).toBeVisible()
        const warning = page.getByTestId('cart-minimum-warning')
        await expect(warning).toBeVisible()
        await expect(warning).toContainText(/7,10/u) // 25,00 minimum - 17,90 of goods, from the client's own maths
        await expect(page.getByRole('link', { name: /Valider la commande/u })).toHaveAttribute(
          'aria-disabled',
          'true',
        )
        await backend.mock.scenario({ quoteFailure: null })
      })
      await test.step('/cart: switching to pickup lifts the block', async () => {
        await goto('/fr/cart')
        await page.getByTestId('cart-switch-to-pickup').click()
        await expect(page.getByTestId('cart-minimum-warning')).toHaveCount(0)
        await expect(page.getByRole('link', { name: /Valider la commande/u })).not.toHaveAttribute(
          'aria-disabled',
          'true',
        )
      })
    }

    const phone = page.getByTestId('checkout-phone-input')
    await test.step('checkout: a phone number is required, then saved to the account', async () => {
      await page.getByRole('link', { name: /Valider la commande/u }).click()
      await page.waitForURL('**/fr/checkout')
      await page.waitForLoadState('networkidle')
      await expect(payButton).toBeVisible()
      await noHorizontalScroll(page, 'checkout')
      await expect(phone).toBeVisible()
      // Pay without a number stops on the form: nothing reaches createOrder.
      await payButton.click()
      await expect(
        page
          .getByRole('alert')
          .filter({ hasText: /téléphone|numéro/iu })
          .first(),
      ).toBeVisible()
      expect(await backend.mock.operations('createOrder')).toHaveLength(0)
      await noHorizontalScroll(page, 'checkout with errors')
      await phone.fill('0470 12 34 56')
      await page.getByTestId('checkout-phone-save').click()
      await expect(phone).toBeHidden() // Saved (updateMe) and collapsed
      expect(
        (await backend.mock.state()).user.phoneNumber,
        'updateMe did not reach the API',
      ).toMatch(/470/u)
    })

    await test.step('pickup is selected', async () => {
      await page.getByTestId('checkout-option-pickup').click()
      await expect(page.getByTestId('checkout-option-pickup')).toHaveAttribute(
        'aria-checked',
        'true',
      )
    })

    await test.step('the pay bar keeps the total readable while the quote is updating', async () => {
      await backend.mock.scenario({ quoteDelayMs: 3_000 })
      // Changing the payment method re-quotes (the online fee changes the total).
      await page.getByTestId('payment-online').click()
      await page.getByTestId('payment-cash').click()
      await expect(
        page.locator('[data-testid="checkout-quote-updating"]:visible').first(),
      ).toBeVisible()
      const bar = (await payButton.boundingBox()) ?? { x: 0, width: 0 }
      for (const part of await payButton.locator('span').all()) {
        const box = await part.boundingBox()
        if (!box || box.width === 0) continue
        expect(
          box.x + box.width,
          `"${(await part.innerText()).trim()}" is cut off at the right edge of the pay button`,
        ).toBeLessThanOrEqual(bar.x + bar.width + 0.5)
      }
      await expect(payButton).toContainText('€')
      await backend.mock.scenario({ quoteDelayMs: 0 })
      await expect(page.locator('[data-testid="checkout-quote-updating"]:visible')).toHaveCount(0, {
        timeout: 20_000,
      })
    })

    await test.step('cash: acknowledge, the amount shows the change due', async () => {
      await page.getByTestId('payment-cash').click()
      await page.getByTestId('cash-acknowledge').check()
      const amount = page.getByTestId('cash-payment-amount')
      await amount.fill('100')
      const change = page.getByTestId('cash-amount-change')
      await expect(change).toBeVisible()
      // Pickup, cash, goods below the 20,00 discount threshold, no online fee: TS 17,90 (change 82,10), YGF 11,60 (88,40).
      await expect(change).toContainText(isTokyo ? '82,10' : '88,40')
      await expect(payButton).toContainText(isTokyo ? '17,90' : '11,60')
      await amount.fill('1')
      await amount.blur() // The shortfall is only said once the field was left (or Pay was tried)
      await expect(page.getByTestId('cash-amount-short')).toBeVisible()
      await amount.fill('100')
      await expect(change).toBeVisible()
      await noHorizontalScroll(page, 'checkout cash')
    })

    let orderId = ''
    await test.step('Pay creates the cash order and lands on its confirmation', async () => {
      await payButton.click()
      await page.waitForURL('**/fr/order-completed/**')
      orderId = /order-completed\/([^/?#]+)/u.exec(page.url())?.[1] ?? ''
      expect(orderId).toMatch(/^[0-9a-f-]{36}$/u)
      const order = (await backend.mock.createdOrders()).find((o) => o.id === orderId)
      expect(order, 'the order never reached createOrder').toBeDefined()
      expect(order?.input).toMatchObject({
        isOnlinePayment: false,
        orderType: 'PICKUP',
        cashPaymentAmount: '100',
      })
      const items = order?.input?.items
      expect(Array.isArray(items) ? items.length : 0).toBe(2)
    })

    await test.step('the confirmation shows the order, nothing is clipped, the cart is cleared', async () => {
      await expect(page.getByTestId('order-completed-title')).toBeVisible()
      await expect(page.getByTestId('order-completed-items')).toBeVisible()
      await expect(page.getByTestId('order-completed-verifying')).toHaveCount(0)
      await expect(page.getByTestId('order-completed-payment-problem')).toHaveCount(0)
      await noHorizontalScroll(page, 'order-completed')
      // A long choice list or product name wraps instead of being cut off.
      const clipped = await page
        .getByTestId('order-completed-items')
        .locator('p')
        .evaluateAll((paragraphs) =>
          paragraphs
            .filter((p) => p.scrollWidth > p.clientWidth + 1)
            .map((p) => (p.textContent ?? '').trim().slice(0, 80)),
        )
      expect(clipped, `ordered lines are cut off: ${clipped.join(' | ')}`).toEqual([])
      await expect.poll(async () => (await cartLines(page)).length).toBe(0)
      await expect(page.getByTestId('floating-cart-bar')).toHaveCount(0)
    })

    await test.step('the emptied cart stays empty on the menu', async () => {
      await goto('/fr/menu')
      await expect(page.getByTestId('product-card').first()).toBeVisible()
      await expect(page.getByTestId('floating-cart-bar')).toHaveCount(0)
      expect(await cartLines(page)).toHaveLength(0)
    })

    await test.step('the browser reported no error during the run', async () => {
      expect(problems(), problems().join('\n')).toEqual([])
    })
  })
})
