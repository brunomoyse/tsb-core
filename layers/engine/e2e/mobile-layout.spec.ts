import type { Locator, Page } from '@playwright/test'
import { MIN_TARGET, measureLayout } from './support/layout'
import { addSimpleProductToCart } from './support/nav'
import { chooseLocale } from './support/locale'
import { expect, test } from './support/test'
import { message } from './support/i18n'
import { requestCode, submitCode } from './support/login'
import { waitForNuxtHydration } from './support/hydration'

/*
 * Layout guardrails on a phone: the main pages at 320, 360, 390 and 430 px in French and Dutch (the longest strings of
 * the four languages), both brands. On every page, nothing may stick out sideways and no two controls may cover each other
 * (support/layout.ts); the primary actions are asserted to be at least 44 px; every other control that is smaller is attached
 * to the test as `small-tap-targets` for the report (it does not fail: those are accepted today, see the review notes).
 *
 * Motion is reduced so the entry animations (cards that scale in) are finished when the boxes are measured.
 */

const WIDTHS = [320, 360, 390, 430] as const
const LANGUAGES = ['fr', 'nl'] as const

async function settle(page: Page) {
  await waitForNuxtHydration(page)
  await page.evaluate(() => document.fonts.ready)
}

/** Opens a page at the current width and checks it; returns the small targets it found. */
async function checkPage(page: Page, path: string, label = path): Promise<string[]> {
  await page.goto(path)
  await settle(page)
  return checkHere(page, label)
}

async function checkHere(page: Page, label: string): Promise<string[]> {
  await expectMobileLayoutWithoutTargets(page, label)
  return (await measureLayout(page)).small.map((entry) => `${label}: ${entry}`)
}

/** Overflow and overlap are asserted; the tap-target sweep is reported separately (primary actions are asserted by name). */
async function expectMobileLayoutWithoutTargets(page: Page, label: string) {
  const width = page.viewportSize()?.width ?? 0
  const report = await measureLayout(page)
  expect.soft(report.overflow, `${label} @${width}: sticks out sideways`).toEqual([])
  expect.soft(report.overlap, `${label} @${width}: overlapping controls`).toEqual([])
}

/** The primary actions of a page, asserted at 44 x 44 or more (full-width buttons are wider, never shorter). */
async function expectPrimaryTargets(page: Page, label: string, actions: Record<string, Locator>) {
  for (const [name, locator] of Object.entries(actions)) {
    const target = locator.first()
    await expect(target, `${label}: ${name} is on the page`).toBeVisible()
    const box = await target.boundingBox()
    expect
      .soft(box?.height ?? 0, `${label}: ${name} height`)
      .toBeGreaterThanOrEqual(MIN_TARGET - 0.5)
    expect.soft(box?.width ?? 0, `${label}: ${name} width`).toBeGreaterThanOrEqual(MIN_TARGET - 0.5)
  }
}

test.describe('phone layout, signed out', () => {
  for (const language of LANGUAGES)
    for (const width of WIDTHS) {
      test(`${language} at ${width}px`, async ({
        page,
        context,
        baseURL,
        backend,
        brand,
      }, testInfo) => {
        test.skip(!backend.isMock, 'needs the mock catalog')
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await chooseLocale(context, baseURL ?? '', language)
        await page.setViewportSize({ width, height: 700 })
        const small: string[] = []
        const at = (path: string) => `/${language}${path}`

        for (const path of [
          '',
          '/menu',
          '/contact',
          '/faq',
          '/terms',
          '/privacy',
          '/account-deletion',
          '/cart',
        ])
          small.push(...(await checkPage(page, at(path))))
        if (brand === 'ygfliege')
          for (const path of ['/concept', '/about'])
            small.push(...(await checkPage(page, at(path))))

        // The 404 page (it replaces the layout).
        small.push(...(await checkPage(page, at('/une-page-qui-nexiste-pas'), '404')))

        // Menu with a product in the cart: the floating cart bar, then the cart sheet.
        await addSimpleProductToCart(page, at('/menu'))
        small.push(...(await checkHere(page, `${at('/menu')} with a cart`)))
        small.push(...(await checkPage(page, at('/cart'), `${at('/cart')} with a product`)))
        await expectPrimaryTargets(page, at('/cart'), {
          checkout: page.locator('main a[href$="/checkout"]'),
        })

        // A guest at the checkout meets the delivery-zone gate (where delivery exists), then the sign-in in place.
        small.push(...(await checkPage(page, at('/checkout'), `${at('/checkout')} (guest)`)))
        const gate = page
          .getByRole('region')
          .filter({ hasText: message(brand, language, 'delivery.gate.title') })
        if (await gate.isVisible()) {
          await gate
            .getByRole('radio', { name: message(brand, language, 'delivery.modal.pickupTab') })
            .click()
          await expect(page.getByTestId('login-submit')).toBeVisible()
          small.push(...(await checkHere(page, `${at('/checkout')} (guest, pickup)`)))
        }
        await expectPrimaryTargets(page, at('/checkout'), {
          'sign in': page.getByTestId('login-submit'),
        })

        // The login steps: address, code, and for a new account the name.
        await backend.mock.scenario({ otp: { newAccount: true } })
        await page.goto(at('/auth/login'))
        await page.waitForURL(/authRequest=/u)
        await page.locator('#auth-email').waitFor()
        await settle(page)
        small.push(...(await checkHere(page, at('/auth/login'))))
        await expectPrimaryTargets(page, at('/auth/login'), {
          continue: page.getByTestId('login-submit'),
          google: page.getByRole('button', { name: /Google/u }),
          apple: page.getByRole('button', { name: /Apple/u }),
        })
        await requestCode(page, 'nina@example.test')
        small.push(...(await checkHere(page, `${at('/auth/login')} code step`)))
        await expectPrimaryTargets(page, `${at('/auth/login')} code step`, {
          verify: page.getByTestId('login-verify'),
          back: page.locator('form button[type="button"]').first(),
        })
        await submitCode(page, '123456')
        await page.locator('#auth-firstname').waitFor()
        small.push(...(await checkHere(page, `${at('/auth/login')} name step`)))

        await testInfo.attach('small-tap-targets', {
          body: [...new Set(small)].join('\n') || 'none',
          contentType: 'text/plain',
        })
      })
    }
})

test.describe('phone layout, signed in', () => {
  for (const language of LANGUAGES)
    for (const width of WIDTHS) {
      test(`${language} at ${width}px`, async ({
        authenticatedPage: page,
        context,
        baseURL,
        backend,
        brand,
      }, testInfo) => {
        test.skip(!backend.isMock, 'needs the mock API')
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await chooseLocale(context, baseURL ?? '', language)
        await page.setViewportSize({ width, height: 700 })
        const at = (path: string) => `/${language}${path}`
        const small: string[] = []
        await backend.mock.user({ phoneNumber: '+32470123456', address: 'place-home' })
        const done = await backend.seedOrder({
          status: 'PICKED_UP',
          online: true,
          paymentStatus: 'paid',
          withItem: true,
        })
        await backend.seedOrder({ status: 'PREPARING', online: false, withItem: true })
        const cancelled = await backend.seedOrder({ status: 'PENDING', online: false })
        await backend.mock.patchOrder(cancelled, {
          status: 'CANCELLED',
          cancellationReason: 'OUT_OF_STOCK',
        })

        // Account page and its dialogs.
        small.push(...(await checkPage(page, at('/me'))))
        const dialogs: [RegExp, string][] = [
          [/^(Mettre à jour|Profiel|Update|更新)/iu, 'profile dialog'],
        ]
        const editProfile = page
          .locator('button', {
            hasText:
              /^\s*(Mettre à jour le profil|Profiel bijwerken|Profiel|Update profile|更新资料)/iu,
          })
          .first()
        if (await editProfile.count()) {
          await editProfile.click()
          await expect(page.getByRole('dialog')).toBeVisible()
          small.push(...(await checkHere(page, `${at('/me')} ${dialogs[0]?.[1]}`)))
          await page.keyboard.press('Escape')
          await expect(page.getByRole('dialog')).toBeHidden()
        }
        await page.locator('.bento-address button').click()
        await expect(page.getByRole('dialog')).toBeVisible()
        small.push(...(await checkHere(page, `${at('/me')} address dialog`)))
        await page.keyboard.press('Escape')
        await expect(page.getByRole('dialog')).toBeHidden()
        await page.locator('button.inline-flex.min-h-11.items-center.text-xs').last().click()
        await expect(page.getByRole('dialog')).toBeVisible()
        small.push(...(await checkHere(page, `${at('/me')} delete dialog`)))
        await page.keyboard.press('Escape')

        // The order list with every row open (the longest status labels, the invoice button).
        await page.goto(at('/me/orders'))
        await settle(page)
        const rows = page.locator('button[aria-controls^="order-panel-"]')
        await expect(rows).toHaveCount(3)
        for (let index = 0; index < 3; index++) await rows.nth(index).click()
        await expectPrimaryTargets(page, at('/me/orders'), {
          'order row': rows.first(),
          invoice: page
            .locator('[id^="order-panel-"] button')
            .filter({ hasText: /^(?!\s*$).+/u })
            .last(),
        })
        small.push(...(await checkHere(page, `${at('/me/orders')} opened`)))

        // The checkout of a signed-in customer, and the order confirmation.
        await addSimpleProductToCart(page, at('/menu'))
        small.push(...(await checkPage(page, at('/checkout'), `${at('/checkout')} (signed in)`)))
        small.push(...(await checkPage(page, at(`/order-completed/${done}`), 'order confirmation')))

        // A product with choices, one with a long name, and the bowl composer.
        const productIds =
          brand === 'tokyosushi' ? ['p-teriyaki', 'p-long', 'p-bento'] : ['p-decouverte', 'p-the']
        for (const id of productIds) {
          await page.goto(`${at('/menu')}?product=${id}`)
          await settle(page)
          await expect(page.getByTestId('product-modal')).toBeVisible()
          await expectPrimaryTargets(page, `product ${id}`, {
            add: page.getByTestId('product-modal-add-to-cart'),
            close: page
              .getByTestId('product-modal')
              .getByRole('button', { name: /^(Fermer|Sluiten|Close|关闭)/iu }),
          })
          small.push(...(await checkHere(page, `product modal ${id}`)))
        }
        if (brand === 'ygfliege') {
          await page.goto(`${at('/menu')}?product=p-bowl`)
          await settle(page)
          await expect(page.getByTestId('bowl-composer')).toBeVisible()
          await expectPrimaryTargets(page, 'composer', {
            add: page.getByTestId('bowl-composer-add-to-cart'),
            close: page.getByTestId('bowl-composer-close'),
          })
          small.push(...(await checkHere(page, 'bowl composer')))
        }

        await testInfo.attach('small-tap-targets', {
          body: [...new Set(small)].join('\n') || 'none',
          contentType: 'text/plain',
        })
      })
    }
})
