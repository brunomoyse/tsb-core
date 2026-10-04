import { LOCALES, chooseLocale } from './support/locale'
import { addSimpleProductToCart, cartLines, openMobileMenu, switchLanguage } from './support/nav'
import { expect, test } from './support/test'
import { message } from './support/i18n'
import { waitForNuxtHydration } from './support/hydration'

/*
 * Languages on a phone (Pixel 5, 393 px), both brands: the picker lives in the phone menu; switching keeps the page and
 * the cart, and the menu closes behind the choice. The head tags and the redirects are in i18n.spec.ts.
 */

test.beforeEach(({ backend }) => {
  test.skip(!backend.isMock, 'needs the mock catalog')
})

test('the picker is in the phone menu, names the current language, and lists the four', async ({
  page,
  brand,
}) => {
  await page.goto('/fr/menu')
  await waitForNuxtHydration(page)
  await openMobileMenu(page)
  const picker = page.locator('[data-testid="language-picker"]:visible').first()
  await expect(picker).toHaveAttribute(
    'aria-label',
    new RegExp(message(brand, 'fr', 'nav.language'), 'u'),
  )
  await picker.click()
  for (const code of LOCALES)
    await expect(page.getByTestId(`language-option-${code}`)).toBeVisible()
  // Each language is named in itself, and the current one is marked.
  await expect(page.getByTestId('language-option-nl')).toContainText('Nederlands')
  await expect(page.getByTestId('language-option-zh')).toContainText('中文')
  await expect(page.locator('[data-language-panel] [aria-current]')).toHaveCount(1)
})

test('switching from the phone menu keeps the page and the cart, and the open menu now speaks the new language', async ({
  page,
  brand,
}) => {
  await addSimpleProductToCart(page, '/fr/menu')
  const before = await cartLines(page)
  await switchLanguage(page, 'nl')
  await expect(page).toHaveURL(/\/nl\/menu$/u)
  await expect(page.locator('html')).toHaveAttribute('lang', 'nl-BE')
  expect(await cartLines(page)).toEqual(before)
  // The menu stays open on purpose (it is how the visitor sees the change): its entries are Dutch now, and the picker
  // dropdown itself has closed.
  await expect(
    page
      .locator('#mobile-menu')
      .getByRole('link', { name: message(brand, 'nl', 'nav.login'), exact: true }),
  ).toBeVisible()
  await expect(page.locator('[data-language-panel]')).toHaveCount(0)
})

for (const code of ['en', 'nl', 'zh'] as const)
  test(`a ${code} visitor gets a menu, a cart and a login page in ${code}`, async ({
    page,
    context,
    baseURL,
    brand,
  }) => {
    await chooseLocale(context, baseURL ?? '', code)
    await addSimpleProductToCart(page, `/${code}/menu`)
    await page.goto(`/${code}/cart`)
    await waitForNuxtHydration(page)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.goto(`/${code}/auth/login`)
    await page.waitForURL(/authRequest=/u)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      message(brand, code, 'login.title'),
    )
    expect(new URL(page.url()).pathname).toBe(`/${code}/auth/login`)
  })

test('the language picked on the account page is the one the next pages open in', async ({
  authenticatedPage: page,
  brand,
}) => {
  await page.goto('/fr/me')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Bonjour')
  // The account page lists the four languages as links of its own.
  await page.getByRole('link', { name: 'Nederlands' }).last().click()
  await page.waitForURL(/\/nl\/me$/u)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    `${message(brand, 'nl', 'me.greeting')}, Eva`,
  )
  await page.goto('/')
  await page.waitForURL(/\/nl\/?$/u)
})
