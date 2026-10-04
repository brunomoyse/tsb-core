import { type Locator, type Page } from '@playwright/test'
import { type Brand, expect, test } from '../../../layers/engine/e2e/support/test'
import { message } from '../../../layers/engine/e2e/support/i18n'

/*
 * The bowl composer ("Malatang sur mesure") on a phone (Pixel 5, 393 px), against the mock YGF menu: the rules of its
 * three groups (one broth, 5 to 20 ingredients, one spice level), what the count and the price do while a bowl is built,
 * and what ends up in the cart. The happy path and the fixed sets are in compose-bowl.spec.ts (desktop).
 *
 * Prices of the mock menu: base 2,50; vegetables, tofu and corn 1,00; udon 1,20; prawns 2,50.
 */

test.beforeEach(({ backend }) => {
  test.skip(!backend.isMock, 'needs the mock catalog')
})

const composer = (page: Page) => page.getByTestId('bowl-composer')
const add = (page: Page) => page.getByTestId('bowl-composer-add-to-cart')
const row = (root: Locator, id: string) => root.getByTestId(`bowl-composer-choice-${id}`)
const inc = (root: Locator, id: string) => root.getByTestId(`bowl-composer-choice-inc-${id}`)
const dec = (root: Locator, id: string) => root.getByTestId(`bowl-composer-choice-dec-${id}`)

const VEGETABLES = ['ch-pak', 'ch-epi', 'ch-broc', 'ch-tofu', 'ch-mais'] as const

async function open(page: Page): Promise<Locator> {
  await page.goto('/fr/menu?product=p-bowl')
  await expect(composer(page)).toBeVisible()
  return composer(page)
}

/** The "n/max" counter of the ingredients group. */
const ingredientsCount = (root: Locator, brand: Brand, count: number, max: number) =>
  root.getByText(message(brand, 'fr', 'composer.selectedCount', { count, max }))

test('opens from the hero button and from a deep link, and closes with its button and with Escape', async ({
  page,
}) => {
  await page.goto('/fr/menu')
  await page.getByTestId('composer-hero-cta').tap()
  await expect(composer(page)).toBeVisible()
  await expect(page).toHaveURL(/\?product=p-bowl$/u)
  await page.getByTestId('bowl-composer-close').tap()
  await expect(composer(page)).toBeHidden()
  await expect(page).toHaveURL(/\/fr\/menu$/u)

  await open(page)
  await page.reload()
  await expect(composer(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(composer(page)).toBeHidden()
})

test('nothing can be added until the broth, 5 ingredients and the spice level are chosen, and the summary says what is missing', async ({
  page,
  brand,
}) => {
  const root = await open(page)
  await expect(add(page)).toBeDisabled()
  // The first thing missing is named under the title of the footer.
  await expect(root.getByText('Bouillon', { exact: true }).last()).toBeVisible()

  await row(root, 'ch-tomate').tap()
  await expect(add(page)).toBeDisabled()
  for (const id of VEGETABLES.slice(0, 4)) await inc(root, id).tap()
  await expect(ingredientsCount(root, brand, 4, 20)).toBeVisible()
  await row(root, 'ch-moyen').tap()
  // 4 of 5 ingredients: still refused.
  await expect(add(page)).toBeDisabled()

  await inc(root, VEGETABLES[4]).tap()
  await expect(ingredientsCount(root, brand, 5, 20)).toBeVisible()
  await expect(add(page)).toBeEnabled()
  // The price only shows once the bowl is valid: 2,50 + 5 x 1,00.
  await expect(add(page)).toContainText('7,50')
})

test('the price follows every ingredient, by its own supplement', async ({ page }) => {
  const root = await open(page)
  await row(root, 'ch-tomate').tap()
  await row(root, 'ch-doux').tap()
  for (const id of VEGETABLES) await inc(root, id).tap()
  await expect(add(page)).toContainText('7,50')
  await inc(root, 'ch-udon').tap()
  await expect(add(page)).toContainText('8,70')
  await inc(root, 'ch-crev').tap()
  await expect(add(page)).toContainText('11,20')
  await dec(root, 'ch-udon').tap()
  await expect(add(page)).toContainText('10,00')
  // The same ingredient twice counts twice.
  await inc(root, 'ch-crev').tap()
  await expect(add(page)).toContainText('12,50')
})

test('an ingredient is capped at 20 in all: at the limit every "+" is off, and removing one lifts it', async ({
  page,
  brand,
}) => {
  const root = await open(page)
  await row(root, 'ch-tomate').tap()
  await row(root, 'ch-doux').tap()
  for (let count = 0; count < 20; count++) await inc(root, 'ch-pak').tap()
  await expect(ingredientsCount(root, brand, 20, 20)).toBeVisible()
  await expect(inc(root, 'ch-pak')).toBeDisabled()
  await expect(inc(root, 'ch-udon')).toBeDisabled()
  // 2,50 + 20 x 1,00, and the bowl is valid at the top of the range.
  await expect(add(page)).toBeEnabled()
  await expect(add(page)).toContainText('22,50')

  await dec(root, 'ch-pak').tap()
  await expect(ingredientsCount(root, brand, 19, 20)).toBeVisible()
  await expect(inc(root, 'ch-udon')).toBeEnabled()
})

test('"-" stops at zero, and the stepper of the bowl stops at one', async ({ page }) => {
  const root = await open(page)
  await expect(dec(root, 'ch-pak')).toBeDisabled()
  await inc(root, 'ch-pak').tap()
  await expect(dec(root, 'ch-pak')).toBeEnabled()
  await dec(root, 'ch-pak').tap()
  await expect(dec(root, 'ch-pak')).toBeDisabled()

  const decrease = root.getByRole('button', { name: 'Diminuer la quantité de Malatang sur mesure' })
  await expect(decrease).toBeDisabled()
})

test('the broth and the spice level are exclusive: a new pick replaces the old one', async ({
  page,
}) => {
  const root = await open(page)
  await row(root, 'ch-tomate').tap()
  await row(root, 'ch-champi').tap()
  await expect(row(root, 'ch-tomate')).toHaveAttribute('aria-pressed', 'false')
  await expect(row(root, 'ch-champi')).toHaveAttribute('aria-pressed', 'true')
  await row(root, 'ch-doux').tap()
  await row(root, 'ch-fort').tap()
  await expect(row(root, 'ch-doux')).toHaveAttribute('aria-pressed', 'false')
  await expect(row(root, 'ch-fort')).toHaveAttribute('aria-pressed', 'true')
})

test('a long ingredient name wraps inside the sheet', async ({ page }) => {
  const root = await open(page)
  const long = row(root, 'ch-boul')
  await long.scrollIntoViewIfNeeded()
  const box = await long.boundingBox()
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(
    (page.viewportSize()?.width ?? 0) + 0.5,
  )
  // And its "+" is still reachable beside it.
  await expect(inc(root, 'ch-boul')).toBeInViewport({ ratio: 1 })
})

test('the bowl goes to the cart with its choices; the same bowl again joins that line, another one gets its own', async ({
  page,
}) => {
  const compose = async (extra: string) => {
    const root = await open(page)
    await row(root, 'ch-tomate').tap()
    await row(root, 'ch-moyen').tap()
    for (const id of VEGETABLES) await inc(root, id).tap()
    if (extra) await inc(root, extra).tap()
    await add(page).tap()
    await expect(composer(page)).toBeHidden()
  }
  const lines = () =>
    page.evaluate(
      () =>
        (
          JSON.parse(localStorage.getItem('cart') ?? '{}') as {
            products?: { productId: string; quantity: number }[]
          }
        ).products ?? [],
    )

  await compose('')
  expect(await lines()).toEqual([expect.objectContaining({ productId: 'p-bowl', quantity: 1 })])
  await compose('')
  expect(await lines()).toEqual([expect.objectContaining({ productId: 'p-bowl', quantity: 2 })])
  await compose('ch-udon')
  expect(await lines()).toHaveLength(2)
})

test('closing the composer with a half-built bowl adds nothing, and the next opening starts empty', async ({
  page,
}) => {
  const root = await open(page)
  await row(root, 'ch-tomate').tap()
  await inc(root, 'ch-pak').tap()
  await page.getByTestId('bowl-composer-close').tap()
  const lines = await page.evaluate(() => localStorage.getItem('cart'))
  expect(
    lines === null || (JSON.parse(lines) as { products?: unknown[] }).products?.length === 0,
  ).toBe(true)

  const again = await open(page)
  await expect(row(again, 'ch-tomate')).toHaveAttribute('aria-pressed', 'false')
  await expect(add(page)).toBeDisabled()
})

test('the footer (stepper and add button) stays on screen while the groups scroll', async ({
  page,
}) => {
  const root = await open(page)
  await expect(add(page)).toBeInViewport({ ratio: 1 })
  await root.getByTestId('bowl-composer-choice-ch-fort').scrollIntoViewIfNeeded()
  await expect(add(page)).toBeInViewport({ ratio: 1 })
})

test('ordering several bowls at once asks for 5 ingredients per bowl, and the price is for all of them', async ({
  page,
  brand,
}) => {
  const root = await open(page)
  await row(root, 'ch-tomate').tap()
  await row(root, 'ch-moyen').tap()
  for (const id of VEGETABLES) await inc(root, id).tap()
  await expect(add(page)).toContainText('7,50')

  // Two bowls: the ingredients are shared out between them, 10 in all.
  await root.getByRole('button', { name: 'Augmenter la quantité de Malatang sur mesure' }).tap()
  await expect(add(page)).toBeDisabled()
  await expect(ingredientsCount(root, brand, 5, 40)).toBeVisible()
  await expect(root.getByText('Sélectionnez au moins 5 options')).toBeVisible()
  for (const id of VEGETABLES) await inc(root, id).tap()
  await expect(add(page)).toBeEnabled()
  // 2 x 2,50 + 10 x 1,00.
  await expect(add(page)).toContainText('15,00')

  await add(page).tap()
  const [line] = await page.evaluate(
    () =>
      (JSON.parse(localStorage.getItem('cart') ?? '{}') as { products?: { quantity: number }[] })
        .products ?? [],
  )
  expect(line?.quantity).toBe(2)
})
