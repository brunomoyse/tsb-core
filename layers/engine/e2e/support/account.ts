import { type Locator, type Page, expect } from '@playwright/test'

/*
 * Helpers for the account page (/me, pages/me/index.vue). The page has no test ids: its controls are found by their
 * accessible names, which are the French strings of locales/fr.json (the mock and the specs run in French).
 */

/** Opens /me signed in and waits until it has loaded the profile (the greeting names the user). */
export async function openAccount(page: Page, firstName = 'Eva'): Promise<void> {
  await page.goto('/fr/me')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(`Bonjour, ${firstName}`)
}

/** The "Mettre à jour le profil" dialog, opened. */
export async function openProfileDialog(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'Mettre à jour le profil' }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  return dialog
}

/** The toast the app shows (and announces) after an action; they live in the notification bar. */
export const toast = (page: Page, text: string | RegExp): Locator => page.getByText(text).first()

/** Picks an address in the autocomplete of the open dialog: types, waits for the suggestion, clicks it. */
export async function pickAddress(dialog: Locator, query: string, suggestion: string | RegExp) {
  const input = dialog.getByRole('combobox')
  await input.fill(query)
  await dialog.getByRole('option', { name: suggestion }).click()
  await expect(dialog.getByTestId('address-selected')).toBeVisible()
}
