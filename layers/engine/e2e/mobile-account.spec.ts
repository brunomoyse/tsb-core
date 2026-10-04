import { openAccount, openProfileDialog, pickAddress, toast } from './support/account'
import { expect, test } from './support/test'
import { measureLayout } from './support/layout'

/*
 * The account page on a phone, both brands, at the narrowest widths real phones have (320 and 360 px) and the common 393:
 * a dialog can be used end to end with a thumb, nothing in it sits off screen, and the order list opens and downloads.
 * What the profile form validates is in account.spec.ts (desktop, same code).
 */

// A button counts as on screen when all but a pixel of it is (a dialog's border and rounding cut the last fraction).
const REACHABLE = 0.95

test.beforeEach(({ backend }) => {
  test.skip(!backend.isMock, 'needs the mock API')
})

// iPhone SE (1st generation), a small Android, and a current phone: the dialogs must work on the shortest of them too.
for (const [width, height] of [
  [320, 568],
  [360, 640],
  [393, 727],
] as const) {
  test.describe(`at ${width}x${height}`, () => {
    test.use({ viewport: { width, height } })

    test('the phone number can be typed in the profile dialog: the field is on screen and saves', async ({
      authenticatedPage: page,
      backend,
    }) => {
      await openAccount(page)
      const dialog = await openProfileDialog(page)
      const phone = dialog.getByLabel('Téléphone', { exact: true })
      // Regression: the country select took the width of its longest option and pushed this input 300 px off the screen.
      await expect(phone).toBeInViewport({ ratio: 1 })
      await expect(dialog.getByLabel('Pays du numéro de téléphone')).toBeInViewport({ ratio: 1 })
      expect((await measureLayout(page)).overflow).toEqual([])

      await phone.fill('0470 12 34 56')
      await dialog.getByTestId('profile-submit').click()
      await expect(dialog).toBeHidden()
      const [call] = await backend.mock.operations('updateMe')
      expect(call?.args.input).toMatchObject({ phoneNumber: '+32470123456' })
    })

    test('both buttons of the profile dialog and of the deletion dialog can be scrolled to and reached', async ({
      authenticatedPage: page,
    }) => {
      await openAccount(page)
      const profile = await openProfileDialog(page)
      for (const button of [
        profile.getByRole('button', { name: 'Annuler' }),
        profile.getByTestId('profile-submit'),
      ]) {
        await button.scrollIntoViewIfNeeded()
        await expect(button).toBeInViewport({ ratio: REACHABLE })
      }
      await profile.getByRole('button', { name: 'Annuler' }).click()

      await page.getByRole('button', { name: 'Supprimer le compte' }).click()
      const dialog = page.getByRole('dialog')
      await dialog.getByRole('checkbox').check()
      for (const button of [
        dialog.getByRole('button', { name: 'Annuler' }),
        dialog.getByRole('button', { name: 'Supprimer définitivement' }),
      ]) {
        await button.scrollIntoViewIfNeeded()
        await expect(button).toBeInViewport({ ratio: REACHABLE })
      }
      expect((await measureLayout(page)).overflow).toEqual([])
    })

    test('the address dialog: pick a suggestion with a tap and save', async ({
      authenticatedPage: page,
      backend,
    }) => {
      await openAccount(page)
      await page.getByRole('button', { name: 'Ajouter une adresse' }).tap()
      const dialog = page.getByRole('dialog')
      await pickAddress(dialog, 'Avenue Blonden 33', /Avenue Blonden 33/u)
      await dialog.getByRole('button', { name: 'Enregistrer' }).tap()
      await expect(toast(page, 'Votre adresse a bien été mise à jour.')).toBeVisible()
      expect((await backend.mock.state()).user.address?.id).toBe('place-mid')
    })
  })
}

test('the order list opens on a tap, lists the lines, and downloads the invoice', async ({
  authenticatedPage: page,
  backend,
}) => {
  const id = await backend.seedOrder({
    status: 'PICKED_UP',
    online: true,
    paymentStatus: 'paid',
    withItem: true,
  })
  await page.goto('/fr/me/orders')
  const row = page.locator('button[aria-controls^="order-panel-"]').first()
  await row.tap()
  await expect(page.locator('[id^="order-panel-"]').first()).toContainText('x2')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Télécharger la facture' }).tap()
  expect((await download).suggestedFilename()).toBe(`facture-${id.slice(-4)}.pdf`)
})

test('the e-mail switches are tapped, not just clicked, and keep their state', async ({
  authenticatedPage: page,
}) => {
  await openAccount(page)
  const marketing = page.getByRole('switch', { name: 'E-mails marketing' })
  await marketing.tap()
  await expect(marketing).toHaveAttribute('aria-checked', 'true')
  await marketing.tap()
  await expect(marketing).toHaveAttribute('aria-checked', 'false')
})
