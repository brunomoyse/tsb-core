import { type FullConfig, chromium } from '@playwright/test'
import { authStateFile } from './paths'
import { existsSync, unlinkSync, writeFileSync } from 'node:fs'
import { loginViaOtpAndCaptureState } from './auth-flow'

/*
 * Drive the OTP login flow ONCE per run so per-test fixtures don't have to.
 * Captures oidc-client-ts localStorage entries to the app's e2e folder; the
 * authenticatedPage fixture (support/test.ts) replays them via addInitScript.
 *
 * `email` undefined means this brand has no e2e auth configured: logged-in
 * specs then skip with a message naming the env vars to set.
 */
export async function captureAuthState(
  config: FullConfig,
  email: string | undefined,
  label: string,
): Promise<void> {
  if (!email) {
    console.warn(
      `${label}: no e2e user email set, skipping auth state capture (authenticated tests will skip)`,
    )
    return
  }

  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000'
  const loginOrigin = (config.projects[0]?.use as { loginOrigin?: string } | undefined)?.loginOrigin

  const browser = await chromium.launch()
  try {
    const ctx = await browser.newContext({ baseURL, locale: 'fr-BE' })
    const page = await ctx.newPage()
    const state = await loginViaOtpAndCaptureState(page, baseURL, email, loginOrigin)
    writeFileSync(authStateFile(config.configFile), JSON.stringify(state))
    console.log(
      `${label}: captured OIDC state for ${email} (${state.entries.length} localStorage entries)`,
    )
  } catch (e) {
    console.error(`${label}: OTP login failed:`, e instanceof Error ? e.message : e)
    throw e
  } finally {
    await browser.close()
  }
}

/** Drop captured OIDC state so the next run is forced to re-authenticate (token TTL is ~1h). */
export function clearAuthState(config: FullConfig): void {
  const file = authStateFile(config.configFile)
  if (existsSync(file)) unlinkSync(file)
}
