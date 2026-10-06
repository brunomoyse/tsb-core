import { layoutShifts, totalShift, trackLayoutShifts } from './support/layout-shift'
import { expect, test } from './support/test'
import { SEL } from './support/selectors'
import { waitForNuxtHydration } from './support/hydration'

/*
 * The menu does not move when the product images arrive, both brands, at the phone widths of the layout guard.
 *
 * The product cards reserve their picture's box (square thumbnails, whose real aspect ratio is 1:1), so the card, and the
 * add-to-cart button under it, stay where they were painted. Every thumbnail is answered slowly here, so the page is painted and
 * hydrated long before the first picture lands: a box reserved with another ratio would grow the card then (the first row's
 * button jumped ~45 px, CLS 0.035 on a phone). Google counts anything under 0.1 as good: this asserts 0.01, the shift of a
 * page that does not move.
 */

const WIDTHS = [320, 360, 390, 430] as const
const IMAGE_DELAY_MS = 900
const MAX_CLS = 0.01

test.beforeEach(({ backend }) => {
  test.skip(!backend.isMock, 'needs the mock catalog and its fake images')
})

for (const width of WIDTHS)
  test(`the menu does not shift while its images load, at ${width} px`, async ({ page, brand }) => {
    await page.setViewportSize({ width, height: 800 })
    await page.route('**/images/thumbnails/**', async (route) => {
      const response = await route.fetch()
      await new Promise((resolve) => {
        setTimeout(resolve, IMAGE_DELAY_MS)
      })
      await route.fulfill({ response })
    })
    await trackLayoutShifts(page)
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await expect(page.locator(SEL.productCard).first()).toBeVisible()
    // The first screen's pictures have landed (the lazy ones are still far below).
    await expect
      .poll(() =>
        page.evaluate(() =>
          [...document.querySelectorAll<HTMLImageElement>('[data-testid="product-card"] img')]
            .filter(
              (img) =>
                img.getBoundingClientRect().top < window.innerHeight && img.loading !== 'lazy',
            )
            .every((img) => img.complete),
        ),
      )
      .toBe(true)
    // Then read the whole menu: the cards that load on the way are in view while their picture lands.
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight * 0.7) {
        window.scrollTo(0, y)
        await new Promise((resolve) => {
          setTimeout(resolve, 150)
        })
      }
    })
    await expect
      .poll(
        () =>
          page.evaluate(() =>
            [
              ...document.querySelectorAll<HTMLImageElement>('[data-testid="product-card"] img'),
            ].every((img) => img.complete),
          ),
        { timeout: 20_000 },
      )
      .toBe(true)

    const shifts = await layoutShifts(page)
    expect(
      totalShift(shifts),
      `${brand} @${width}: the menu moved, ${JSON.stringify(shifts)}`,
    ).toBeLessThan(MAX_CLS)
  })
