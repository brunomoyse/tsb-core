import { expect, test } from '../../../layers/engine/e2e/support/test'

/*
 * YGF accessibility details a Lighthouse run does not check: the logo link's accessible name (the visible name, then where the
 * link goes, with the Chinese name still marked as Chinese), and the heading outline of the about page.
 */
test.beforeEach(({ backend }) => {
  test.skip(!backend.isMock, 'needs the mock')
})

test('the logo link is named by its visible text plus "Accueil", and keeps the Chinese name marked', async ({
  page,
}) => {
  await page.goto('/fr')
  const logo = page.locator('a.lockup:visible').first()
  // Wide screen: the sub-line is shown, so the name is the whole visible lockup.
  await expect(logo).toBeVisible()
  await expect(logo).not.toHaveAttribute('aria-label', /.+/u)
  await expect(logo).toHaveAccessibleName('Yangguofu 杨国福麻辣烫 · Liège – Accueil')
  const chinese = logo.locator('[lang="zh-Hans"]')
  await expect(chinese).toHaveCount(1)
  await expect(chinese).toHaveText('杨国福麻辣烫')

  // Phone: the sub-line is hidden (display: none), so the name is the visible "Yangguofu".
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(logo).toBeVisible()
  await expect(logo).toHaveAccessibleName('Yangguofu – Accueil')
})

test('the about page timeline has its own h2: its dates are not children of the last story block', async ({
  page,
}) => {
  await page.goto('/fr/about')
  const levels = await page
    .locator('main h1, main h2, main h3')
    .evaluateAll((headings) => headings.map((h) => Number(h.tagName.slice(1))))
  expect(levels[0]).toBe(1)
  // No level is skipped going down, and the first h3 of the timeline follows an h2.
  for (let i = 1; i < levels.length; i += 1)
    expect(levels[i]! - levels[i - 1]!).toBeLessThanOrEqual(1)
  const timeline = page.locator('section:has(ol) h2.sr-only')
  await expect(timeline).toHaveText('Les grandes dates')
  const firstDate = page.locator('section:has(ol) h3').first()
  const precedingLevel = await firstDate.evaluate((h3) => {
    const all = [...document.querySelectorAll('h1, h2, h3')]
    return Number(all[all.indexOf(h3) - 1]!.tagName.slice(1))
  })
  expect(precedingLevel).toBe(2)
})
