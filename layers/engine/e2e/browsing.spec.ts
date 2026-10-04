import { categoryIds, chipIsActive, stickyBottom } from './support/nav'
import { expect, test } from './support/test'
import { SEL } from './support/selectors'
import { message } from './support/i18n'
import { waitForNuxtHydration } from './support/hydration'

/*
 * Browsing on a desktop (1440 px), both brands, where the layout differs from the phone's (mobile-browsing.spec.ts covers
 * the rest of the menu): the always-visible navigation, the category strip of the Tokyo Sushi menu, the product modal as a
 * dialog over the page (backdrop, Escape, focus), and the information pages.
 */

test.beforeEach(({ backend }) => {
  test.skip(!backend.isMock, 'needs the mock catalog')
})

test.describe('navigation', () => {
  test('the primary links go to the menu and to the contact page, and there is no hamburger', async ({
    page,
    brand,
  }) => {
    await page.goto('/fr')
    await waitForNuxtHydration(page)
    await expect(page.locator('button[aria-controls="mobile-menu"]')).toBeHidden()
    const nav = page.getByRole('navigation').first()
    await nav.getByRole('link', { name: message(brand, 'fr', 'nav.menu'), exact: true }).click()
    await page.waitForURL(/\/fr\/menu$/u)
    await expect(page.locator(SEL.productCard).first()).toBeVisible()
    await page
      .getByRole('navigation')
      .first()
      .getByRole('link', { name: message(brand, 'fr', 'nav.contact'), exact: true })
      .click()
    await page.waitForURL(/\/fr\/contact$/u)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  })

  test('the logo leads back to the home page of the current language', async ({ page }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await page
      .getByRole('link', { name: /Accueil|Tokyo Sushi|Yangguofu/u })
      .first()
      .click()
    await page.waitForURL(/\/fr\/?$/u)
  })
})

test.describe('categories (Tokyo Sushi: the strip is on the desktop too)', () => {
  test.beforeEach(({ brand }) => {
    test.skip(brand !== 'tokyosushi', 'the Yangguofu menu has no category strip above 640 px')
  })

  test('each chip jumps to its section clear of the sticky block, and the spy follows the page', async ({
    page,
  }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    const ids = await categoryIds(page)
    expect(ids.length).toBeGreaterThan(3)
    const target = ids[2] ?? ''
    await page.locator(`[data-chip-category="${target}"]`).click()
    const heading = page.locator(`#category-${target} h2`).first()
    await expect(heading).toBeInViewport({ ratio: 1 })
    await expect
      .poll(async () => Math.round((await heading.boundingBox())?.y ?? -1))
      .toBeGreaterThanOrEqual(Math.floor(await stickyBottom(page)))
    await expect.poll(() => chipIsActive(page, target)).toBe(true)
  })

  test('at the end of the page the last category is the selected one', async ({ page }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    const ids = await categoryIds(page)
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight }))
    await expect.poll(() => chipIsActive(page, ids.at(-1) ?? '')).toBe(true)
  })

  test('the filter chips wrap instead of scrolling sideways', async ({ page }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    const scrolls = await page
      .getByRole('button', { name: 'Halal', exact: true })
      .evaluate((chip) => {
        const row = chip.parentElement
        return row ? row.scrollWidth > row.clientWidth + 1 : true
      })
    expect(scrolls).toBe(false)
  })
})

test.describe('product modal as a dialog', () => {
  const openFirstChoiceProduct = async (page: import('@playwright/test').Page) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    const card = page.locator(SEL.choiceProduct).first()
    await expect(card).toBeVisible()
    const id = (await card.getAttribute('data-product-id')) ?? ''
    await card.locator('[data-testid="product-name"]').click()
    const modal = page.getByTestId('product-modal').or(page.getByTestId('bowl-composer'))
    await expect(modal).toBeVisible()
    return { id, modal }
  }

  test('Escape closes it and the page behind is where it was', async ({ page }) => {
    const { modal } = await openFirstChoiceProduct(page)
    await page.keyboard.press('Escape')
    await expect(modal).toBeHidden()
    await expect(page).toHaveURL(/\/fr\/menu$/u)
  })

  test('a click on the backdrop closes it, a click inside does not', async ({ page }) => {
    const { modal } = await openFirstChoiceProduct(page)
    await modal.click({ position: { x: 20, y: 20 } })
    await expect(modal).toBeVisible()
    await page.mouse.click(4, 4)
    await expect(modal).toBeHidden()
  })

  test('Tab stays inside the dialog', async ({ page }) => {
    const { modal } = await openFirstChoiceProduct(page)
    for (let press = 0; press < 25; press++) {
      await page.keyboard.press('Tab')
      expect(
        await modal.evaluate((el) => el.contains(document.activeElement)),
        `Tab ${press + 1} left the dialog`,
      ).toBe(true)
    }
  })

  test('the page behind it is locked while it is open', async ({ page }) => {
    await openFirstChoiceProduct(page)
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')
    await page.keyboard.press('Escape')
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
  })
})

test.describe('information pages', () => {
  for (const [path, key] of [
    ['/terms', 'schema.terms.title'],
    ['/privacy', 'schema.privacy.title'],
    ['/contact', 'schema.contact.title'],
    ['/account-deletion', 'schema.accountDeletion.title'],
  ] as const)
    test(`${path} has its own title and a heading`, async ({ page, brand }) => {
      await page.goto(`/fr${path}`)
      await waitForNuxtHydration(page)
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
      expect(await page.title()).toBe(message(brand, 'fr', key))
    })

  test('the FAQ has its title and its questions', async ({ page }) => {
    await page.goto('/fr/faq')
    await waitForNuxtHydration(page)
    expect(await page.title()).toMatch(/^FAQ/u)
    expect(await page.locator('main details').count()).toBeGreaterThan(3)
  })

  test('the footer reaches the terms and the privacy policy', async ({ page, brand }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await page
      .getByRole('link', { name: message(brand, 'fr', 'footer.terms'), exact: true })
      .first()
      .click()
    await page.waitForURL(/\/fr\/terms$/u)
    await expect(page).toHaveTitle(message(brand, 'fr', 'schema.terms.title'))
    await page
      .getByRole('link', { name: message(brand, 'fr', 'footer.privacy'), exact: true })
      .first()
      .click()
    await page.waitForURL(/\/fr\/privacy$/u)
    await expect(page).toHaveTitle(message(brand, 'fr', 'schema.privacy.title'))
  })
})
