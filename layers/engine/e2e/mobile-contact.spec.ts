import { expect, test } from './support/test'
import { waitForNuxtHydration } from './support/hydration'

/*
 * The feedback form of the contact page on a phone (Pixel 5, 393 px), both brands, against the mock's POST /feedback: what
 * enables the button, what is sent, what each refusal says, and that the form comes back for a second message.
 */

test.beforeEach(({ backend }) => {
  test.skip(!backend.isMock, 'needs the mock feedback endpoint')
})

const MESSAGE = 'Les gyozas étaient parfaits, merci beaucoup !'

async function fill(page: import('@playwright/test').Page, { message = MESSAGE } = {}) {
  await page.goto('/fr/contact')
  await waitForNuxtHydration(page)
  await page.locator('#feedback-name').scrollIntoViewIfNeeded()
  await page.locator('#feedback-name').fill('Eva Mock')
  await page.locator('#feedback-email').fill('eva@example.test')
  await page.getByRole('button', { name: 'À emporter', exact: true }).tap()
  await page.getByRole('button', { name: 'Compliment', exact: true }).tap()
  await page.locator('#feedback-message').fill(message)
}

const send = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: 'Envoyer', exact: true })

test('the button stays off until every field is filled and the message has 10 characters', async ({
  page,
}) => {
  await page.goto('/fr/contact')
  await waitForNuxtHydration(page)
  await expect(send(page)).toBeDisabled()
  await page.locator('#feedback-name').fill('Eva')
  await page.locator('#feedback-email').fill('eva@example.test')
  await page.getByRole('button', { name: 'Livraison', exact: true }).tap()
  await page.getByRole('button', { name: 'Suggestion', exact: true }).tap()
  await page.locator('#feedback-message').fill('trop court')
  // 10 characters exactly is enough: "trop court" has 10.
  await expect(send(page)).toBeEnabled()
  await page.locator('#feedback-message').fill('court')
  await expect(send(page)).toBeDisabled()
})

test('the choice buttons say which one is on', async ({ page }) => {
  await page.goto('/fr/contact')
  await waitForNuxtHydration(page)
  const takeaway = page.getByRole('button', { name: 'À emporter', exact: true })
  const delivery = page.getByRole('button', { name: 'Livraison', exact: true })
  await takeaway.tap()
  await expect(takeaway).toHaveAttribute('aria-pressed', 'true')
  await delivery.tap()
  await expect(takeaway).toHaveAttribute('aria-pressed', 'false')
  await expect(delivery).toHaveAttribute('aria-pressed', 'true')
})

test('sends the message, thanks the customer, and offers another one', async ({
  page,
  backend,
}) => {
  await fill(page)
  await send(page).tap()
  await expect(page.getByText('Merci pour votre retour')).toBeVisible()
  const [call] = await backend.mock.restCalls('/feedback')
  expect(call?.method).toBe('POST')
  expect(call?.body).toMatchObject({
    name: 'Eva Mock',
    email: 'eva@example.test',
    serviceType: 'takeaway',
    feedbackType: 'compliment',
    message: MESSAGE,
    // The hidden trap field a person never fills.
    website: '',
  })

  await page.getByRole('button', { name: 'Envoyer un autre avis' }).tap()
  await expect(page.locator('#feedback-message')).toHaveValue('')
  await expect(send(page)).toBeDisabled()
})

for (const [failure, text] of [
  ['rate_limited', 'Trop de soumissions'],
  ['invalid', 'Veuillez vérifier les champs'],
  ['captcha_failed', 'vérification anti-robot a échoué'],
  ['server', 'Un problème est survenu'],
] as const)
  test(`a ${failure} answer is reported and the typed message is kept`, async ({
    page,
    backend,
  }) => {
    await backend.mock.scenario({ feedbackFailure: failure })
    await fill(page)
    await send(page).tap()
    await expect(page.getByText(text).first()).toBeVisible()
    await expect(page.locator('#feedback-message')).toHaveValue(MESSAGE)
    await expect(send(page)).toBeEnabled()

    await backend.mock.scenario({ feedbackFailure: null })
    await send(page).tap()
    await expect(page.getByText('Merci pour votre retour')).toBeVisible()
  })
