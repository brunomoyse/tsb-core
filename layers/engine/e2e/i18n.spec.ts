import { ACCEPT_LANGUAGE, LOCALES, type Locale, chooseLocale } from './support/locale'
import { addSimpleProductToCart, cartLines, switchLanguage } from './support/nav'
import { expect, test } from './support/test'
import { expectNoUntranslatedText, message, untranslatedText } from './support/i18n'
import { layoutShifts, totalShift, trackLayoutShifts } from './support/layout-shift'
import { settleNuxt, waitForNuxtHydration, watchHydrationMismatches } from './support/hydration'

/*
 * Languages (fr default, en, nl, zh), both brands, desktop layout (phone: mobile-i18n.spec.ts): the URL prefix and the
 * head tags a crawler reads, the first-visit redirect from the browser's language, switching language without losing the
 * route or the cart, the right language on screen, and a sweep that no page shows a raw key in any language.
 */

const HTML_LANG: Record<Locale, string> = { fr: 'fr-BE', en: 'en', nl: 'nl-BE', zh: 'zh-CN' }
const OG_LOCALE: Record<Locale, string> = { fr: 'fr_BE', en: 'en_US', nl: 'nl_BE', zh: 'zh_CN' }

test.describe('URL prefixes and head tags', () => {
  for (const locale of LOCALES) {
    test(`/${locale}/…: html lang, canonical, hreflang alternates and og:locale name this language`, async ({
      request,
      baseURL,
    }) => {
      for (const path of ['', '/menu', '/contact', '/faq']) {
        const response = await request.get(`/${locale}${path}`, {
          headers: {
            cookie: `i18n_redirected=${locale}`,
            'accept-language': ACCEPT_LANGUAGE[locale],
          },
        })
        expect(response.status(), `${locale}${path}`).toBe(200)
        const html = await response.text()
        const label = `/${locale}${path}`
        expect(html, label).toMatch(new RegExp(`<html[^>]*\\slang="${HTML_LANG[locale]}"`, 'u'))
        expect(html, `${label} canonical`).toContain(
          `rel="canonical" href="${baseURL}/${locale}${path}"`,
        )
        for (const other of LOCALES)
          expect(html, `${label} hreflang ${other}`).toContain(
            `href="${baseURL}/${other}${path}" hreflang="${other}"`,
          )
        expect(html, `${label} x-default`).toContain(
          `href="${baseURL}/fr${path}" hreflang="x-default"`,
        )
        expect(html, `${label} og:locale`).toContain(
          `property="og:locale" content="${OG_LOCALE[locale]}"`,
        )
      }
    })
  }

  test('private pages stay out of the index in every language', async ({ request }) => {
    for (const locale of LOCALES)
      for (const path of ['/auth/login', '/me', '/me/orders']) {
        const response = await request.get(`/${locale}${path}`, {
          headers: { cookie: `i18n_redirected=${locale}` },
        })
        expect(await response.text(), `/${locale}${path}`).toMatch(
          /<meta[^>]+name="robots"[^>]+content="noindex,nofollow"/u,
        )
      }
  })

  test('a page that does not exist is a real 404 in its language, not a redirect to the home page', async ({
    request,
  }) => {
    for (const locale of LOCALES) {
      const response = await request.get(`/${locale}/cette-page-nexiste-pas`, {
        headers: { cookie: `i18n_redirected=${locale}` },
        maxRedirects: 0,
      })
      expect(response.status(), locale).toBe(404)
    }
  })
})

test.describe('first visit', () => {
  for (const [header, expected] of [
    ['nl-BE,nl;q=0.9,en;q=0.5', 'nl'],
    ['zh-CN,zh;q=0.9', 'zh'],
    ['en-GB,en;q=0.9', 'en'],
    ['fr-FR,fr;q=0.9', 'fr'],
    // Not a language of the site: the default one, not a 404 or a blank page.
    ['de-DE,de;q=0.9', 'fr'],
  ] as const) {
    test(`the root goes to /${expected} for Accept-Language "${header}"`, async ({
      browser,
      baseURL,
    }) => {
      const context = await browser.newContext({
        baseURL,
        locale: header.split(',')[0] || 'en-US',
        extraHTTPHeaders: header ? { 'Accept-Language': header } : {},
      })
      const page = await context.newPage()
      await page.goto('/')
      await page.waitForURL(new RegExp(`/${expected}/?$`, 'u'))
      await expect(page.locator('html')).toHaveAttribute('lang', HTML_LANG[expected])
      await context.close()
    })
  }

  test('the language chosen once is remembered: later visits to the root and to other languages follow it', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      baseURL,
      extraHTTPHeaders: { 'Accept-Language': ACCEPT_LANGUAGE.fr },
    })
    const page = await context.newPage()
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await switchLanguage(page, 'nl')
    const cookies = await context.cookies()
    expect(cookies.find((cookie) => cookie.name === 'i18n_redirected')?.value).toBe('nl')

    // A French browser, but Dutch was picked: the root follows the choice.
    await page.goto('/')
    await page.waitForURL(/\/nl\/?$/u)
    await context.close()
  })

  /*
   * Pinned as it is today: with `detectBrowserLanguage.redirectOn: 'all'` the redirect applies to every path, so a visitor
   * whose browser says French and who opens a shared /nl/... link is sent to /fr/.... (Crawlers send no
   * Accept-Language and see every language; this only affects people.) If the product wants shared links to keep their
   * language, the redirect should be limited to the root (`redirectOn: 'root'`) and this test flipped.
   */
  test('a link to another language is redirected to the browser language on the first visit (current behaviour)', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      baseURL,
      extraHTTPHeaders: { 'Accept-Language': ACCEPT_LANGUAGE.fr },
    })
    const page = await context.newPage()
    await page.goto('/nl/menu')
    await page.waitForURL(/\/fr\/menu/u)
    await context.close()
  })
})

test.describe('switching language', () => {
  test('keeps the page and the cart', async ({ page, backend }) => {
    test.skip(!backend.isMock, 'needs the mock catalog')
    await addSimpleProductToCart(page, '/fr/menu')
    const before = await cartLines(page)
    expect(before).toHaveLength(1)

    for (const code of ['en', 'nl', 'zh', 'fr'] as const) {
      await switchLanguage(page, code)
      await expect(page).toHaveURL(new RegExp(`/${code}/menu`, 'u'))
      await expect(page.locator('html')).toHaveAttribute('lang', HTML_LANG[code])
      expect(await cartLines(page)).toEqual(before)
    }
  })

  for (const path of ['/contact', '/faq', '/terms', '/privacy', '/cart']) {
    test(`on ${path} the new language shows the same page`, async ({ page }) => {
      await page.goto(`/fr${path}`)
      await waitForNuxtHydration(page)
      await switchLanguage(page, 'nl')
      await expect(page).toHaveURL(new RegExp(`/nl${path}(?:[/?#]|$)`, 'u'))
      await expect(page.locator('html')).toHaveAttribute('lang', 'nl-BE')
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    })
  }

  test('on the account page it keeps the session and the page', async ({
    authenticatedPage: page,
    backend,
    brand,
  }) => {
    test.skip(!backend.isMock, 'needs the mock API')
    await page.goto('/fr/me')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Bonjour')
    await switchLanguage(page, 'en')
    await expect(page).toHaveURL(/\/en\/me$/u)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      `${message(brand, 'en', 'me.greeting')}, Eva`,
    )
  })
})

test.describe('the right language is on screen', () => {
  for (const locale of LOCALES) {
    test(`/${locale}: titles and navigation come from the ${locale} messages`, async ({
      page,
      context,
      baseURL,
      brand,
    }) => {
      await chooseLocale(context, baseURL ?? '', locale)
      for (const [path, key] of [
        ['/menu', 'schema.menu.title'],
        ['/contact', 'schema.contact.title'],
        ['/terms', 'schema.terms.title'],
        ['/cart', 'schema.cart.title'],
      ] as const) {
        await page.goto(`/${locale}${path}`)
        expect(await page.title(), `${locale}${path}`).toBe(message(brand, locale, key))
      }

      await page.goto(`/${locale}/cart`)
      await waitForNuxtHydration(page)
      await expect(page.getByText(message(brand, locale, 'cart.empty'))).toBeVisible()
      // The navigation names its destinations in this language.
      const nav = page.getByRole('navigation').first()
      await expect(nav).toContainText(message(brand, locale, 'nav.menu'))
      await expect(nav).toContainText(message(brand, locale, 'nav.contact'))
    })
  }

  test('the login form is in the chosen language end to end', async ({
    page,
    context,
    baseURL,
    brand,
  }) => {
    for (const locale of LOCALES) {
      await chooseLocale(context, baseURL ?? '', locale)
      await page.goto(`/${locale}/auth/login`)
      await page.waitForURL(/authRequest=/u)
      await page.locator('#auth-email').waitFor()
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        message(brand, locale, 'login.title'),
      )
      await expect(page.locator('label[for="auth-email"]')).toHaveText(
        message(brand, locale, 'login.email'),
      )
      await expect(page.getByTestId('login-submit')).toHaveText(
        message(brand, locale, 'login.sendCode'),
      )
      await expect(
        page.getByRole('button', { name: message(brand, locale, 'login.ssoGoogle') }),
      ).toBeVisible()
    }
  })
})

test.describe('no raw translation keys', () => {
  test('the helper really catches a raw key and an unfilled template', async ({ page, brand }) => {
    await page.goto('/fr/faq')
    await waitForNuxtHydration(page)
    await page.evaluate(() => {
      const probe = document.createElement('p')
      probe.id = 'probe'
      probe.textContent = 'checkout.authStep.heading et {count} articles'
      document.body.append(probe)
    })
    expect(await untranslatedText(page, brand)).toEqual([
      'text: checkout.authStep.heading',
      'text: {count}',
    ])
    // An e-mail address or a domain is not a key.
    await page.evaluate(() => {
      document.querySelector('#probe')!.textContent = 'e2e@example.test · tokyosushi.be · 12.50 €'
    })
    expect(await untranslatedText(page, brand)).toEqual([])
  })

  for (const locale of LOCALES) {
    test(`public pages in ${locale}`, async ({ page, context, baseURL, brand, backend }) => {
      test.skip(!backend.isMock, 'needs the mock catalog')
      const mismatches = watchHydrationMismatches(page)
      await chooseLocale(context, baseURL ?? '', locale)
      const paths = [
        '',
        '/menu',
        '/contact',
        '/faq',
        '/terms',
        '/privacy',
        '/cart',
        '/account-deletion',
        '/auth/login',
        '/une-page-qui-nexiste-pas',
        ...(brand === 'ygfliege' ? ['/concept', '/about'] : []),
      ]
      for (const path of paths) {
        await page.goto(`/${locale}${path}`)
        await settleNuxt(page)
        await expectNoUntranslatedText(page, brand, `/${locale}${path}`)
      }
      expect(mismatches(), 'server and client rendered different DOM').toEqual([])
    })

    test(`pages of a signed-in customer with a cart and orders in ${locale}`, async ({
      authenticatedPage: page,
      context,
      baseURL,
      brand,
      backend,
    }) => {
      test.skip(!backend.isMock, 'needs the mock API')
      // Seven page loads, a cart and three orders: more than the default minute on a slow machine.
      test.setTimeout(150_000)
      const mismatches = watchHydrationMismatches(page)
      await backend.mock.user({ phoneNumber: '+32470123456', address: 'place-home' })
      const delivered = await backend.seedOrder({
        status: 'PICKED_UP',
        online: true,
        paymentStatus: 'paid',
        withItem: true,
      })
      await backend.seedOrder({ status: 'PREPARING', online: false, withItem: true })
      const cancelled = await backend.seedOrder({
        status: 'PENDING',
        online: true,
        paymentStatus: 'open',
      })
      await backend.mock.settleOrder(cancelled, 'CANCELLED', 'canceled')
      await backend.mock.patchOrder(cancelled, { cancellationReason: 'OUT_OF_STOCK' })
      await chooseLocale(context, baseURL ?? '', locale)

      await addSimpleProductToCart(page, `/${locale}/menu`)
      for (const path of [
        '/menu',
        '/cart',
        '/checkout',
        '/me',
        '/me/orders',
        `/order-completed/${delivered}`,
      ]) {
        await page.goto(`/${locale}${path}`)
        await settleNuxt(page)
        await page.locator('main').first().waitFor()
        if (path === '/me/orders')
          await page.locator('button[aria-controls^="order-panel-"]').first().click()
        await expectNoUntranslatedText(page, brand, `/${locale}${path}`)
      }
      expect(mismatches(), 'server and client rendered different DOM').toEqual([])
    })
  }

  /*
   * A signed-in customer reloading /me: the server renders the page without a user (the OIDC session and the persisted profile
   * live in localStorage, which it cannot read), and the first client render has to be that same page, or Vue reports
   * "Hydration completed but contains mismatches" and renders it all again. The profile is shown once the page is mounted
   * (pages/me/index.vue); the cells keep their height, so nothing moves when it arrives.
   */
  test('a signed-in customer opening /me hydrates without a mismatch and without a layout shift', async ({
    authenticatedPage: page,
    backend,
  }) => {
    test.skip(!backend.isMock, 'needs the mock API')
    await backend.mock.user({ phoneNumber: '+32470123456', address: 'place-home' })
    const mismatches = watchHydrationMismatches(page)
    await trackLayoutShifts(page)
    // Any page first: the profile is persisted (localStorage "auth") once the app has loaded it.
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('auth') ?? ''))
      .toContain('e2e@')
    await page.goto('/fr/me')
    await waitForNuxtHydration(page)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Bonjour')
    await expect(page.getByText('+32470123456')).toBeVisible()
    expect(mismatches()).toEqual([])
    const shifts = await layoutShifts(page)
    expect(totalShift(shifts), `/me moved: ${JSON.stringify(shifts)}`).toBeLessThan(0.01)
  })
})
