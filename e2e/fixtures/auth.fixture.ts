import { type Page, test as base } from '@playwright/test'
import { dirname, join } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import type { CapturedOidcState } from '../helpers/auth-flow'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const STATE_FILE = join(__dirname, '..', '.auth-state.json')

let cachedState: CapturedOidcState | null = null

function loadAuthState(): CapturedOidcState | null {
  if (cachedState) return cachedState
  if (!existsSync(STATE_FILE)) return null
  cachedState = JSON.parse(readFileSync(STATE_FILE, 'utf-8')) as CapturedOidcState
  return cachedState
}

/*
 * The fixture shortcuts the OTP UI by replaying the oidc-client-ts localStorage
 * entries captured in globalSetup. Tests that need an authenticated user get a
 * ready-to-use page without paying the email-poll cost on every test.
 *
 * Mechanism: addInitScript runs before any page script on every navigation,
 * so the OIDC user is in localStorage by the time the auth middleware reads
 * it via isAuthenticated().
 */
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page, context }, use) => {
    const state = loadAuthState()
    if (!state) {
      base.skip(true, 'No e2e auth state — set E2E_USER_EMAIL and ensure the zitadel DB tunnel is reachable so globalSetup can capture a session')
      return
    }

    await context.clearCookies()
    await context.addInitScript((entries: [string, string][]) => {
      for (const [key, value] of entries) {
        localStorage.setItem(key, value)
      }
    }, state.entries)

    await use(page)
  },
})

export { expect } from '@playwright/test'
