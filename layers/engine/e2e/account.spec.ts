import type { MockControl } from './mock/client'
import { expect, test } from './support/test'
import { openAccount, openProfileDialog, pickAddress, toast } from './support/account'
import { sessionEntries } from './support/login'

/*
 * The account page (/me) against the mock API: profile edit with its phone validation (Belgian and foreign numbers
 * through the country picker), the saved address, the e-mail preferences and the account deletion. French UI, desktop
 * (the phone layout is in mobile-account.spec.ts), both brands. What the app sent is read back from the mock's
 * operation log, so a spec checks the request as well as the screen.
 */

test.beforeEach(({ backend }) => {
  test.skip(!backend.isMock, 'needs the mock API')
})

/** The `input` of the n-th updateMe the app sent (0 = first). */
const updateMeInput = async (backend: { mock: MockControl }, nth = 0) =>
  (await backend.mock.operations('updateMe'))[nth]?.args.input as Record<string, unknown>

test.describe('profile', () => {
  test('shows what the account holds: name, e-mail, phone and address', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await backend.mock.user({ phoneNumber: '+32470123456', address: 'place-home' })
    await openAccount(page)
    await expect(page.getByText('Eva Mock')).toBeVisible()
    await expect(page.getByText('e2e@example.test')).toBeVisible()
    await expect(page.getByRole('link', { name: '+32470123456' })).toHaveAttribute(
      'href',
      'tel:+32470123456',
    )
    await expect(page.getByText('Rue Saint-Gilles 12')).toBeVisible()
    await expect(page.getByText('4000 – Liège')).toBeVisible()
  })

  test('a new name is saved, shown at once, and the dialog closes', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await openAccount(page)
    const dialog = await openProfileDialog(page)
    await dialog.getByLabel('Prénom').fill('Éva-Marie')
    await dialog.getByLabel('Nom de famille').fill('Dupont')
    await dialog.getByTestId('profile-submit').click()

    await expect(toast(page, 'Votre profil a bien été mis à jour.')).toBeVisible()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Bonjour, Éva-Marie')
    await expect(page.getByText('Éva-Marie Dupont')).toBeVisible()
    expect(await updateMeInput(backend)).toMatchObject({
      firstName: 'Éva-Marie',
      lastName: 'Dupont',
      phoneNumber: null,
    })
    // The e-mail is shown, never part of the update.
    expect(await updateMeInput(backend)).not.toHaveProperty('email')
  })

  test('Cancel and Escape close the dialog without saving anything', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await openAccount(page)
    let dialog = await openProfileDialog(page)
    await dialog.getByLabel('Prénom').fill('Changé')
    await dialog.getByRole('button', { name: 'Annuler' }).click()
    await expect(dialog).toBeHidden()

    dialog = await openProfileDialog(page)
    // The edit started again from what is saved, not from the abandoned draft.
    await expect(dialog.getByLabel('Prénom')).toHaveValue('Eva')
    await dialog.getByLabel('Prénom').press('Escape')
    await expect(dialog).toBeHidden()
    expect(await backend.mock.operations('updateMe')).toHaveLength(0)
  })

  test('a required field left empty blocks the save', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await openAccount(page)
    const dialog = await openProfileDialog(page)
    await dialog.getByLabel('Prénom').fill('')
    await dialog.getByTestId('profile-submit').click()
    await expect(dialog).toBeVisible()
    expect(await backend.mock.operations('updateMe')).toHaveLength(0)
  })

  test('a failing save says so, keeps the dialog and the typed values, and can be retried', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await backend.mock.failOperation('updateMe', { code: 'INTERNAL' })
    await openAccount(page)
    const dialog = await openProfileDialog(page)
    await dialog.getByLabel('Prénom').fill('Nouveau')
    await dialog.getByTestId('profile-submit').click()
    await expect(toast(page, 'La mise à jour du profil a échoué.')).toBeVisible()
    await expect(dialog).toBeVisible()
    await expect(dialog.getByLabel('Prénom')).toHaveValue('Nouveau')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Bonjour, Eva')

    await backend.mock.failOperation('updateMe', null)
    await dialog.getByTestId('profile-submit').click()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Bonjour, Nouveau')
  })
})

test.describe('phone number', () => {
  test('an incomplete number is refused with its message, nothing is sent', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await openAccount(page)
    const dialog = await openProfileDialog(page)
    await dialog.getByLabel('Téléphone', { exact: true }).fill('0470')
    await dialog.getByTestId('profile-submit').click()
    await expect(dialog.getByText('Numéro de téléphone invalide')).toBeVisible()
    await expect(dialog.getByLabel('Téléphone', { exact: true })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(await backend.mock.operations('updateMe')).toHaveLength(0)
  })

  test('a Belgian number is stored in international form and reopens as typed', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await openAccount(page)
    let dialog = await openProfileDialog(page)
    await dialog.getByLabel('Téléphone', { exact: true }).fill('0470 12 34 56')
    await dialog.getByTestId('profile-submit').click()
    await expect(dialog).toBeHidden()
    expect(await updateMeInput(backend)).toMatchObject({ phoneNumber: '+32470123456' })
    await expect(page.getByRole('link', { name: '+32470123456' })).toBeVisible()

    dialog = await openProfileDialog(page)
    await expect(dialog.getByLabel('Pays du numéro de téléphone')).toHaveValue('BE')
    await expect(dialog.getByLabel('Téléphone', { exact: true })).toHaveValue('470123456')
  })

  for (const [country, name, typed, stored, local] of [
    ['FR', 'France', '06 12 34 56 78', '+33612345678', '612345678'],
    ['NL', 'Pays-Bas', '06 12345678', '+31612345678', '612345678'],
    ['DE', 'Allemagne', '0151 23456789', '+4915123456789', '15123456789'],
  ] as const) {
    test(`a ${name} number through the country picker is stored with its prefix and reopens on ${country}`, async ({
      authenticatedPage: page,
      backend,
    }) => {
      await openAccount(page)
      let dialog = await openProfileDialog(page)
      await dialog.getByLabel('Pays du numéro de téléphone').selectOption(country)
      await dialog.getByLabel('Téléphone', { exact: true }).fill(typed)
      await dialog.getByTestId('profile-submit').click()
      await expect(dialog).toBeHidden()
      expect(await updateMeInput(backend)).toMatchObject({ phoneNumber: stored })

      dialog = await openProfileDialog(page)
      await expect(dialog.getByLabel('Pays du numéro de téléphone')).toHaveValue(country)
      await expect(dialog.getByLabel('Téléphone', { exact: true })).toHaveValue(local)
      // Saving again without touching it keeps the same number.
      await dialog.getByTestId('profile-submit').click()
      await expect(dialog).toBeHidden()
      expect(await updateMeInput(backend, 1)).toMatchObject({ phoneNumber: stored })
    })
  }

  test('a Belgian number is not valid for another country', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await openAccount(page)
    const dialog = await openProfileDialog(page)
    await dialog.getByLabel('Pays du numéro de téléphone').selectOption('LU')
    await dialog.getByLabel('Téléphone', { exact: true }).fill('0470 12 34 56')
    await dialog.getByTestId('profile-submit').click()
    await expect(dialog.getByText('Numéro de téléphone invalide')).toBeVisible()
    expect(await backend.mock.operations('updateMe')).toHaveLength(0)
  })

  test('emptying the field removes the saved number', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await backend.mock.user({ phoneNumber: '+32470123456' })
    await openAccount(page)
    const dialog = await openProfileDialog(page)
    await expect(dialog.getByLabel('Téléphone', { exact: true })).toHaveValue('470123456')
    await dialog.getByLabel('Téléphone', { exact: true }).fill('')
    await dialog.getByTestId('profile-submit').click()
    await expect(dialog).toBeHidden()
    expect(await updateMeInput(backend)).toMatchObject({ phoneNumber: '' })
    // (not just any +32 link: the footer carries the restaurant's own number)
    await expect(page.getByRole('link', { name: '+32470123456' })).toHaveCount(0)
  })
})

test.describe('saved address', () => {
  test('adds, changes and removes the address', async ({ authenticatedPage: page, backend }) => {
    await openAccount(page)
    await expect(page.getByRole('button', { name: 'Ajouter une adresse' })).toBeVisible()

    // Add.
    await page.getByRole('button', { name: 'Ajouter une adresse' }).click()
    let dialog = page.getByRole('dialog')
    await pickAddress(dialog, 'Rue Saint-Gilles 12', /Rue Saint-Gilles 12/u)
    await dialog.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(toast(page, 'Votre adresse a bien été mise à jour.')).toBeVisible()
    await expect(dialog).toBeHidden()
    await expect(page.getByText('Rue Saint-Gilles 12')).toBeVisible()
    expect(await updateMeInput(backend, 0)).toEqual({ addressPlaceId: 'place-home' })

    // Change.
    await page.getByRole('button', { name: "Modifier l'adresse" }).click()
    dialog = page.getByRole('dialog')
    await pickAddress(dialog, 'Avenue Blonden 33', /Avenue Blonden 33/u)
    await dialog.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText('Avenue Blonden 33')).toBeVisible()
    await expect(page.getByText('Rue Saint-Gilles 12')).toHaveCount(0)
    expect(await updateMeInput(backend, 1)).toEqual({ addressPlaceId: 'place-mid' })

    // Remove, from the profile dialog.
    const profile = await openProfileDialog(page)
    await profile.getByRole('button', { name: 'Supprimer' }).click()
    await profile.getByTestId('profile-submit').click()
    await expect(profile).toBeHidden()
    expect(await updateMeInput(backend, 2)).toMatchObject({ addressPlaceId: '' })
    await expect(page.getByText('Avenue Blonden 33')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Ajouter une adresse' })).toBeVisible()
  })

  test('Save stays disabled until a suggestion is chosen, and typing alone is not a choice', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await backend.mock.user({ address: 'place-home' })
    await openAccount(page)
    await page.getByRole('button', { name: "Modifier l'adresse" }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
    await dialog.getByRole('combobox').fill('Avenue Blonden 33')
    await expect(dialog.getByRole('option', { name: /Avenue Blonden 33/u })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
    expect(await backend.mock.operations('updateMe')).toHaveLength(0)
    await dialog.getByRole('button', { name: 'Annuler' }).click()
    await expect(page.getByText('Rue Saint-Gilles 12')).toBeVisible()
  })

  test('a refused address update is reported and the old address stays', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await backend.mock.user({ address: 'place-home' })
    await backend.mock.failOperation('updateMe', { code: 'ADDRESS_UNRESOLVABLE' })
    await openAccount(page)
    await page.getByRole('button', { name: "Modifier l'adresse" }).click()
    const dialog = page.getByRole('dialog')
    await pickAddress(dialog, 'Avenue Blonden 33', /Avenue Blonden 33/u)
    await dialog.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(toast(page, 'La mise à jour du profil a échoué.')).toBeVisible()
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Annuler' }).click()
    await expect(page.getByText('Rue Saint-Gilles 12')).toBeVisible()
  })
})

test.describe('e-mail preferences', () => {
  test('each switch reflects the account and saves on its own', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await openAccount(page)
    const marketing = page.getByRole('switch', { name: 'E-mails marketing' })
    const updates = page.getByRole('switch', { name: 'Suivi de la commande' })
    await expect(marketing).toHaveAttribute('aria-checked', 'false')
    await expect(updates).toHaveAttribute('aria-checked', 'true')

    await marketing.click()
    await expect(toast(page, 'Préférences de notification mises à jour.')).toBeVisible()
    await expect(marketing).toHaveAttribute('aria-checked', 'true')
    await expect(updates).toHaveAttribute('aria-checked', 'true')
    expect(await updateMeInput(backend, 0)).toEqual({ notifyMarketing: true })

    await updates.click()
    await expect(updates).toHaveAttribute('aria-checked', 'false')
    expect(await updateMeInput(backend, 1)).toEqual({ notifyOrderUpdates: false })

    // It is the account's setting, not the browser's: a reload shows the same.
    await page.reload()
    await expect(page.getByRole('switch', { name: 'E-mails marketing' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await expect(page.getByRole('switch', { name: 'Suivi de la commande' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
  })

  test('a failing save leaves the switch where it was and says so', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await backend.mock.failOperation('updateMe', { code: 'INTERNAL' })
    await openAccount(page)
    const marketing = page.getByRole('switch', { name: 'E-mails marketing' })
    await marketing.click()
    await expect(toast(page, "Impossible d'enregistrer vos préférences.")).toBeVisible()
    await expect(marketing).toHaveAttribute('aria-checked', 'false')
  })
})

test.describe('account deletion', () => {
  test('explains what is deleted and what is kept, and needs the acknowledgement', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await openAccount(page)
    await page.getByRole('button', { name: 'Supprimer le compte' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Supprimer votre compte ?' })).toBeVisible()
    await expect(dialog).toContainText('définitivement anonymisés')
    await expect(dialog).toContainText('législation comptable belge')
    // No order in progress, no warning.
    await expect(dialog).not.toContainText('Vous avez une commande en cours')
    await expect(dialog.getByRole('link', { name: /En savoir plus/u })).toHaveAttribute(
      'href',
      '/fr/account-deletion',
    )

    // Without the tick the button is off; with it, on.
    const confirm = dialog.getByRole('button', { name: 'Supprimer définitivement' })
    await expect(confirm).toBeDisabled()
    await dialog.getByRole('checkbox').check()
    await expect(confirm).toBeEnabled()
    expect(await backend.mock.operations('deleteMe')).toHaveLength(0)

    // Cancel resets the tick.
    await dialog.getByRole('button', { name: 'Annuler' }).click()
    await expect(dialog).toBeHidden()
    await page.getByRole('button', { name: 'Supprimer le compte' }).click()
    await expect(page.getByRole('dialog').getByRole('checkbox')).not.toBeChecked()
  })

  test('warns about an order still in progress without blocking the deletion', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await backend.seedOrder({ status: 'PREPARING', online: false })
    await openAccount(page)
    await page.getByRole('button', { name: 'Supprimer le compte' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('Vous avez une commande en cours')
    await dialog.getByRole('checkbox').check()
    await expect(dialog.getByRole('button', { name: 'Supprimer définitivement' })).toBeEnabled()
  })

  test('confirming deletes the account, ends the session and leaves the site', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await openAccount(page)
    await page.getByRole('button', { name: 'Supprimer le compte' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('checkbox').check()
    await dialog.getByRole('button', { name: 'Supprimer définitivement' }).click()

    await page.waitForURL(/\/fr\/?$/u)
    await expect(toast(page, 'Votre compte a été supprimé.')).toBeVisible()
    expect(await backend.mock.operations('deleteMe')).toHaveLength(1)
    expect((await backend.mock.state()).user.deletionRequestedAt).not.toBeNull()
    expect(await sessionEntries(page)).toHaveLength(0)
    expect(
      await page.evaluate(
        () => (JSON.parse(localStorage.getItem('auth') ?? '{}') as { user?: unknown }).user ?? null,
      ),
    ).toBeNull()

    // The account is gone for this browser: /me asks for a sign-in again.
    await page.goto('/fr/me')
    await page.waitForURL(/\/fr\/auth\/login/u)
  })

  test('a failing deletion keeps the account and the session', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await backend.mock.failOperation('deleteMe', { code: 'INTERNAL' })
    await openAccount(page)
    await page.getByRole('button', { name: 'Supprimer le compte' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('checkbox').check()
    await dialog.getByRole('button', { name: 'Supprimer définitivement' }).click()
    await expect(toast(page, "Nous n'avons pas pu supprimer votre compte")).toBeVisible()
    await expect(dialog).toBeVisible()
    expect(await sessionEntries(page)).toHaveLength(1)
    expect(page.url()).toContain('/fr/me')
  })

  test('the information page lists what is deleted and how to ask by e-mail', async ({ page }) => {
    await page.goto('/fr/account-deletion')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Suppression')
    await expect(page.getByRole('link', { name: /@/u })).toHaveAttribute('href', /^mailto:/u)
    expect(await page.getByRole('heading', { level: 2 }).count()).toBeGreaterThanOrEqual(4)
  })
})
