import { expect, test } from './support/test'

/*
 * Older phones still visit the shop (Android 7 on Chrome 101, iPhones stuck on iOS 16). They lack recent built-ins the
 * code uses, which plugins/polyfills.client.ts adds back (TSB-CORE-F). Here they are removed before any page script
 * runs, and the home page and the menu must still render without a script error.
 */

test.beforeEach(({ backend }) => {
  test.skip(!backend.isMock, 'needs the mock API')
})

test('the home page and the menu work on a browser without the recent built-ins', async ({
  page,
}) => {
  await page.addInitScript(() => {
    for (const [target, name] of [
      [Array.prototype, 'toSorted'],
      [Array.prototype, 'toReversed'],
      [Map, 'groupBy'],
      [Object, 'groupBy'],
    ] as const) {
      Reflect.deleteProperty(target, name)
    }
  })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto('/fr')
  await page.waitForLoadState('networkidle')
  await page.goto('/fr/menu')
  await expect(page.getByTestId('product-card').first()).toBeVisible()

  expect(errors).toEqual([])
})
