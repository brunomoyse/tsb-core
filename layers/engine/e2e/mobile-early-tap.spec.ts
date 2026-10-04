import { cartLines } from './support/order-flow'
import { expect, test } from './support/test'
import { SEL } from './support/selectors'
import { holdHydration } from './support/hydration'

/*
 * The first seconds of a visit on a phone: the server-rendered menu is painted before the app has hydrated, and Vue replays
 * no event, so a tap on an add-to-cart button in that window would do nothing and the visitor would not know why. The
 * accepted behaviour (documented here so that nobody "optimises" it away): until the card is hydrated its add button is
 * DISABLED and visibly dimmed, a tap on it changes nothing (no cart line, no navigation), and the same button works as soon
 * as the app is hydrated, without a reload.
 */
test.beforeEach(({ backend }) => {
  test.skip(!backend.isMock, 'needs the mock catalog')
})

test('a tap on add-to-cart before hydration is visibly refused, and works once the app is hydrated', async ({
  page,
}) => {
  const release = await holdHydration(page)
  // The scripts are held, so the window's load event never comes: resolve on the first byte of the document.
  await page.goto('/fr/menu', { waitUntil: 'commit' })

  const add = page.locator(SEL.simpleProduct).first().getByTestId('product-add-to-cart')
  await add.scrollIntoViewIfNeeded()
  await expect(add).toBeVisible()
  expect(await page.evaluate(() => '__vue_app__' in document.getElementById('__nuxt')!)).toBe(false)

  await test.step('painted but inert: disabled, dimmed, and a tap does nothing', async () => {
    await expect(add).toBeDisabled()
    await expect(add).toHaveCSS('opacity', '0.5')
    await add.click({ force: true })
    expect(await cartLines(page)).toEqual([])
    expect(new URL(page.url()).pathname).toBe('/fr/menu')
  })

  await test.step('hydrated: the same button is enabled and adds the line', async () => {
    await release()
    await expect(add).toBeEnabled({ timeout: 15_000 })
    await expect(add).toHaveCSS('opacity', '1')
    await add.click()
    await expect.poll(async () => (await cartLines(page)).length).toBe(1)
  })
})
