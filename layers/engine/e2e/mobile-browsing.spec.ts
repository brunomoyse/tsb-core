import type { Page } from '@playwright/test'
import {
  categoryIds,
  chipIsActive,
  chipVisibleInRow,
  openMobileMenu,
  stickyBottom,
} from './support/nav'
import { expect, test } from './support/test'
import { SEL } from './support/selectors'
import { message } from './support/i18n'
import { waitForNuxtHydration } from './support/hydration'

/*
 * Browsing the menu on a phone (Pixel 5, 393 px; the narrowest layouts are in mobile-layout.spec.ts), both brands, against
 * the mock catalog: getting from the home page to the menu, the category strip and its scroll-spy, search, the product
 * modal and its URL (deep link, close, back/forward), the allergen notice, the 404 page and the information pages.
 */

test.beforeEach(({ backend }) => {
  test.skip(!backend.isMock, 'needs the mock catalog')
})

test.describe('getting to the menu', () => {
  test('home -> hamburger -> Menu lands on the menu with its products', async ({ page, brand }) => {
    await page.goto('/fr')
    await waitForNuxtHydration(page)
    await openMobileMenu(page)
    await page
      .locator('#mobile-menu')
      .getByRole('link', { name: message(brand, 'fr', 'nav.menu'), exact: true })
      .click()
    await page.waitForURL(/\/fr\/menu$/u)
    await expect(page.locator(SEL.productCard).first()).toBeVisible()
    // The menu closed behind us: its links are not left covering the page.
    await expect(page.locator('button[aria-controls="mobile-menu"]')).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  test('the phone menu closes with Escape and takes focus back to its button', async ({ page }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await openMobileMenu(page)
    await page.keyboard.press('Escape')
    const burger = page.locator('button[aria-controls="mobile-menu"]')
    await expect(burger).toHaveAttribute('aria-expanded', 'false')
    await expect(burger).toBeFocused()
  })
})

test.describe('categories', () => {
  for (const [width, height] of [
    [393, 727],
    [320, 568],
  ] as const)
    test(`the strip lists every category and each chip jumps to its section, clear of the sticky header at ${width}x${height}`, async ({
      page,
    }) => {
      // Instant scrolling: with the smooth jump still running the heading is measured on its way, not where it lands.
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.setViewportSize({ width, height })
      await page.goto('/fr/menu')
      await waitForNuxtHydration(page)
      const ids = await categoryIds(page)
      expect(ids.length).toBeGreaterThan(2)
      // One section per chip, in the same order.
      const sections = await page
        .locator('[id^="category-"]')
        .evaluateAll((els) =>
          els.map((el) => el.id.replace('category-', '')).filter((id) => !id.startsWith('card-')),
        )
      expect(sections).toEqual(ids)

      for (const id of ids
        .slice()
        .reverse()
        .concat(ids[0] ?? [])) {
        await page.locator(`[data-chip-category="${id}"]`).click()
        const heading = page.locator(`#category-${id} h2`).first()
        await expect(heading).toBeInViewport({ ratio: 1 })
        // Settled (smooth scroll): the heading is below everything pinned to the top, and in the upper half.
        await expect
          .poll(async () => {
            const box = await heading.boundingBox()
            return box ? Math.round(box.y) : -1
          })
          .toBeGreaterThanOrEqual(Math.floor(await stickyBottom(page)))
        // (The last category is shorter than a screen: the page cannot scroll it up any further.)
        if (id !== ids.at(-1)) {
          const box = await heading.boundingBox()
          expect(
            box?.y ?? 0,
            `${id}: the heading sits in the upper half of the screen`,
          ).toBeLessThan((page.viewportSize()?.height ?? 0) / 2)
        }
        await expect.poll(() => chipIsActive(page, id)).toBe(true)
      }
    })

  test('scrolling the page moves the selected chip, down to the last category at the end', async ({
    page,
  }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    const ids = await categoryIds(page)
    const middle = ids[Math.floor(ids.length / 2)] ?? ''
    await page.evaluate((id) => {
      const section = document.getElementById(`category-${id}`)
      if (section)
        window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY - 140 })
    }, middle)
    await expect.poll(() => chipIsActive(page, middle)).toBe(true)

    await page.evaluate(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight })
    })
    await expect.poll(() => chipIsActive(page, ids.at(-1) ?? '')).toBe(true)
    // The selected chip is brought into view inside the horizontally scrolling strip.
    await expect.poll(() => chipVisibleInRow(page, ids.at(-1) ?? '')).toBe(true)

    // Back up to the first category (its heading just under the strip).
    await page.evaluate((id) => {
      const section = document.getElementById(`category-${id}`)
      if (section)
        window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY - 140 })
    }, ids[0])
    await expect.poll(() => chipIsActive(page, ids[0] ?? '')).toBe(true)
  })

  /*
   * At the very top of the page, above the first section (search, filters and the allergen notice fill the first screen), no
   * section is in the scroll-spy band: the chip that was selected on the way down used to stay selected ("Accompagnements"
   * over the search box). useMenuCategoryScrollspy selects the first category again when nothing is in the band and the
   * first section is still below it.
   */
  test('back at the very top of the page the first category is selected again', async ({
    page,
  }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    const ids = await categoryIds(page)
    await page.evaluate(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight })
    })
    await expect.poll(() => chipIsActive(page, ids.at(-1) ?? '')).toBe(true)
    await page.evaluate(() => {
      window.scrollTo({ top: 0 })
    })
    await expect.poll(() => chipIsActive(page, ids[0] ?? ''), { timeout: 3_000 }).toBe(true)
  })

  test('scrolling up from the middle of the menu to the very top selects the first category', async ({
    page,
  }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    const ids = await categoryIds(page)
    const middle = ids[Math.floor(ids.length / 2)] ?? ''
    await page.evaluate((id) => {
      const section = document.getElementById(`category-${id}`)
      if (section)
        window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY - 140 })
    }, middle)
    await expect.poll(() => chipIsActive(page, middle)).toBe(true)
    await page.evaluate(() => {
      window.scrollTo({ top: 0 })
    })
    await expect.poll(() => chipIsActive(page, ids[0] ?? ''), { timeout: 3_000 }).toBe(true)
  })

  test('a long category name stays inside its chip', async ({ page, backend, brand }) => {
    void backend
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    const widest = await page
      .locator('[data-chip-category]')
      .evaluateAll(
        (chips, viewport) =>
          Math.max(...chips.map((chip) => chip.getBoundingClientRect().width)) / viewport,
        page.viewportSize()?.width ?? 1,
      )
    expect(widest, `${brand}: no chip is wider than the screen`).toBeLessThanOrEqual(1)
  })
})

test.describe('search', () => {
  test('narrows the menu to the matching products and hides the category strip', async ({
    page,
    brand,
  }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    const all = await page.locator(SEL.productCard).count()
    await page.locator('#menuSearch').fill('gyoza')
    await expect.poll(() => page.locator(SEL.productCard).count()).toBeLessThan(all)
    await expect(page.locator(SEL.productCard)).toHaveCount(1)
    await expect(page.locator(SEL.productCard).first()).toContainText(/gyoza/iu)
    await expect(page.locator('[data-chip-category]')).toHaveCount(0)

    // The clear button empties the field, gives it focus back and restores the menu.
    await page
      .getByRole('button', {
        name: message(brand, 'fr', brand === 'tokyosushi' ? 'nav.clearSearch' : 'common.clear'),
      })
      .click()
    await expect(page.locator('#menuSearch')).toHaveValue('')
    await expect(page.locator('#menuSearch')).toBeFocused()
    await expect(page.locator(SEL.productCard)).toHaveCount(all)
    expect(await page.locator('[data-chip-category]').count()).toBeGreaterThan(2)
  })

  test('every word must match, in any order', async ({ page }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await page.locator('#menuSearch').fill('gyoza boeuf poulet')
    await expect(page.locator(SEL.productCard)).toHaveCount(0)
    await page.locator('#menuSearch').fill('pièces gyoza')
    await expect(page.locator(SEL.productCard)).toHaveCount(1)
  })

  test('says so when nothing matches', async ({ page }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await page.locator('#menuSearch').fill('zzzzzz')
    await expect(page.getByText('Aucun résultat pour « zzzzzz »')).toBeVisible()
    await expect(page.locator(SEL.productCard)).toHaveCount(0)
  })

  test('a shared link with ?q= opens the menu already searched', async ({ page }) => {
    await page.goto('/fr/menu?q=gyoza')
    await waitForNuxtHydration(page)
    await expect(page.locator('#menuSearch')).toHaveValue('gyoza')
    await expect(page.locator(SEL.productCard)).toHaveCount(1)
  })

  test('the search field is 16 px or more, so iOS does not zoom the page on focus', async ({
    page,
  }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    const size = await page
      .locator('#menuSearch')
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
    expect(size).toBeGreaterThanOrEqual(16)
  })
})

test.describe('dietary filters', () => {
  test.beforeEach(({ brand }) => {
    test.skip(
      brand !== 'tokyosushi',
      'only the Tokyo Sushi menu has the halal / vegetarian / spicy chips',
    )
  })

  const chip = (page: Page, key: string) =>
    page.getByRole('button', { name: message('tokyosushi', 'fr', key), exact: true })
  const cards = (page: Page) => page.locator(SEL.productCard)

  test('each chip narrows the menu, shows it is on, and a second tap lifts it', async ({
    page,
  }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    const all = await cards(page).count()

    await chip(page, 'menu.spicy').click()
    await expect(chip(page, 'menu.spicy')).toHaveAttribute('aria-pressed', 'true')
    await expect(cards(page)).toHaveCount(1)
    await expect(cards(page).first()).toContainText('Ramen tonkotsu')

    await chip(page, 'menu.spicy').click()
    await expect(chip(page, 'menu.spicy')).toHaveAttribute('aria-pressed', 'false')
    await expect(cards(page)).toHaveCount(all)

    await chip(page, 'menu.vegetarian').click()
    await expect(cards(page)).toHaveCount(4)
    await chip(page, 'menu.vegetarian').click()

    await chip(page, 'menu.halal').click()
    await expect(cards(page)).toHaveCount(2)
  })

  test('chips combine (every one must hold) and an impossible mix says so', async ({ page }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await chip(page, 'menu.halal').click()
    await chip(page, 'menu.vegetarian').click()
    await expect(cards(page)).toHaveCount(0)
    await expect(page.getByText('Aucun produit disponible').first()).toBeVisible()
    await chip(page, 'menu.vegetarian').click()
    await expect(cards(page)).toHaveCount(2)
  })

  test('filters and search work together', async ({ page }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await chip(page, 'menu.halal').click()
    await page.locator('#menuSearch').fill('gyoza')
    await expect(cards(page)).toHaveCount(1)
    await page.locator('#menuSearch').fill('maki')
    await expect(cards(page)).toHaveCount(0)
  })
})

test.describe('product modal', () => {
  /** A product that opens the modal (it has choices) and its id. */
  const choiceProductId = async (page: Page) => {
    const card = page.locator(SEL.choiceProduct).first()
    await expect(card).toBeVisible()
    return (await card.getAttribute('data-product-id')) ?? ''
  }

  test('opens from the card with the product in the URL, closes with its button and with Back', async ({
    page,
  }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    const id = await choiceProductId(page)
    await page.locator(`[data-product-id="${id}"] [data-testid="product-name"]`).click()
    await expect(page).toHaveURL(new RegExp(`/fr/menu\\?product=${id}$`, 'u'))
    const modal = page.getByTestId('product-modal').or(page.getByTestId('bowl-composer'))
    await expect(modal).toBeVisible()
    // The page behind does not scroll while it is open, and is released afterwards.
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')

    await modal.getByRole('button', { name: 'Fermer' }).first().click()
    await expect(modal).toBeHidden()
    await expect(page).toHaveURL(/\/fr\/menu$/u)
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')

    // Back / Forward walk the same two states.
    await page.goBack()
    await expect(modal).toBeVisible()
    await page.goBack()
    await expect(modal).toBeHidden()
    await expect(page).toHaveURL(/\/fr\/menu$/u)
    await page.goForward()
    await expect(modal).toBeVisible()
  })

  test('Back from the open modal closes it without leaving the menu', async ({ page }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    const id = await choiceProductId(page)
    await page.locator(`[data-product-id="${id}"] [data-testid="product-name"]`).click()
    const modal = page.getByTestId('product-modal').or(page.getByTestId('bowl-composer'))
    await expect(modal).toBeVisible()
    await page.goBack()
    await expect(modal).toBeHidden()
    expect(new URL(page.url()).pathname).toBe('/fr/menu')
    await expect(page.locator(SEL.productCard).first()).toBeVisible()
  })

  test('a deep link opens the modal on load, and so does a reload', async ({ page }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    const id = await choiceProductId(page)
    await page.goto(`/fr/menu?product=${id}`)
    const modal = page.getByTestId('product-modal').or(page.getByTestId('bowl-composer'))
    await expect(modal).toBeVisible()
    await page.reload()
    await expect(modal).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(modal).toBeHidden()
    await expect(page).toHaveURL(/\/fr\/menu$/u)
  })

  test('a product that does not exist says so instead of an empty sheet, and can be closed', async ({
    page,
  }) => {
    await page.goto('/fr/menu?product=does-not-exist')
    const failed = page
      .getByTestId('product-modal-load-error')
      .or(page.getByTestId('bowl-composer-load-error'))
    await expect(failed).toBeVisible()
    await expect(failed).toContainText('Impossible de charger ce produit')
    await page.keyboard.press('Escape')
    await expect(failed).toBeHidden()
  })

  test('an unavailable product says so and cannot be added', async ({ page, backend, brand }) => {
    const id = brand === 'tokyosushi' ? 'p-toro' : 'p-mochi'
    await backend.mock.product(id, { isAvailable: false })
    await page.goto(`/fr/menu?product=${id}`)
    const modal = page.getByTestId('product-modal')
    await expect(modal).toBeVisible()
    await expect(modal).toContainText(message(brand, 'fr', 'menu.unavailable'))
    await expect(page.getByTestId('product-modal-add-to-cart')).toBeDisabled()
  })

  test('the sheet fits the screen: its add button is reachable without scrolling the page', async ({
    page,
  }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    const id = await choiceProductId(page)
    await page.goto(`/fr/menu?product=${id}`)
    const add = page
      .getByTestId('product-modal-add-to-cart')
      .or(page.getByTestId('bowl-composer-add-to-cart'))
    await expect(add).toBeInViewport({ ratio: 1 })
  })

  test('a long product name wraps inside the sheet', async ({ page, brand }) => {
    const id = brand === 'tokyosushi' ? 'p-long' : 'p-the'
    await page.goto(`/fr/menu?product=${id}`)
    const modal = page.getByTestId('product-modal')
    await expect(modal).toBeVisible()
    const title = modal.getByRole('heading').first()
    const box = await title.boundingBox()
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(
      (page.viewportSize()?.width ?? 0) + 0.5,
    )
  })
})

test.describe('allergen notice', () => {
  test('shows the phone to call, and stays dismissed after the first dismissal', async ({
    page,
  }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    const notice = page.getByText('Allergies ? Infos :')
    await expect(notice).toBeVisible()
    await expect(page.locator('a[href^="tel:"]').first()).toBeVisible()

    await notice
      .locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]')
      .getByRole('button', { name: 'Fermer' })
      .click()
    await expect(notice).toBeHidden()
    expect(await page.evaluate(() => localStorage.getItem('allergenNoticeDismissed'))).toBe('true')
    await page.reload()
    await waitForNuxtHydration(page)
    await expect(page.getByText('Allergies ? Infos :')).toHaveCount(0)
  })
})

test.describe('pages that are not the menu', () => {
  test('a page that does not exist is a 404 with a way back to the home page and to the menu', async ({
    page,
    brand,
  }) => {
    const response = await page.goto('/fr/cette-page-nexiste-pas')
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      message(brand, 'fr', 'error.title404'),
    )
    await page.getByRole('button', { name: message(brand, 'fr', 'error.homeButton') }).click()
    await page.waitForURL(/\/fr\/?$/u)

    await page.goto('/fr/cette-page-nexiste-pas')
    await page.getByRole('button', { name: message(brand, 'fr', 'error.menuButton') }).click()
    await page.waitForURL(/\/fr\/menu$/u)
  })

  test('a missing page under a real one is a 404 too', async ({ page }) => {
    const response = await page.goto('/fr/menu/nope')
    expect(response?.status()).toBe(404)
  })

  test('the 404 speaks the language of its URL', async ({ page, context, baseURL, brand }) => {
    await context.addCookies([{ name: 'i18n_redirected', value: 'nl', url: baseURL ?? '' }])
    await page.goto('/nl/deze-pagina-bestaat-niet')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      message(brand, 'nl', 'error.title404'),
    )
    await expect(page.locator('html')).toHaveAttribute('lang', 'nl-BE')
  })

  for (const [path, heading] of [
    ['/terms', /Conditions/u],
    ['/privacy', /Confidentialité|vie privée/iu],
    ['/faq', /FAQ|questions/iu],
    ['/contact', /Contact/iu],
  ] as const)
    test(`${path} renders its content in full width with a heading`, async ({ page }) => {
      await page.goto(`/fr${path}`)
      await waitForNuxtHydration(page)
      await expect(page.getByRole('heading', { level: 1 }).first()).toContainText(heading)
      // Sections (terms, privacy, contact) or one question per <details> (faq).
      expect(await page.locator('main h2, main details').count()).toBeGreaterThan(1)
    })

  test('the FAQ answers open and close one by one', async ({ page }) => {
    await page.goto('/fr/faq')
    await waitForNuxtHydration(page)
    const questions = page.locator('details > summary')
    expect(await questions.count()).toBeGreaterThan(3)
    const first = page.locator('details').first()
    await expect(first).not.toHaveAttribute('open', '')
    await first.locator('summary').click()
    await expect(first).toHaveAttribute('open', '')
    await first.locator('summary').click()
    await expect(first).not.toHaveAttribute('open', '')
  })

  test('the contact page gives the phone, the e-mail and the address to act on', async ({
    page,
  }) => {
    await page.goto('/fr/contact')
    await waitForNuxtHydration(page)
    await expect(page.locator('main a[href^="tel:"]').first()).toBeVisible()
    await expect(page.locator('main a[href^="mailto:"]').first()).toBeVisible()
  })
})
