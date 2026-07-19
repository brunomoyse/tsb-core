import { type FullConfig, chromium } from '@playwright/test'
import { dirname, join } from 'node:path'
import { dbEnv } from './helpers/db-env'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { loginViaOtpAndCaptureState } from './helpers/auth-flow'
import { writeFileSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

function psql(sql: string): string {
  return execSync(
    `PGPASSWORD='${dbEnv.DB_PASS}' psql -h ${dbEnv.DB_HOST} -p ${dbEnv.DB_PORT} -U ${dbEnv.DB_USER} -d ${dbEnv.DB_NAME} -t -A -c "${sql.replace(/"/gu, '\\"')}"`,
    { encoding: 'utf-8' },
  ).trim()
}

const ALL_DAY_HOURS = JSON.stringify({
  monday: { open: '00:00', close: '23:59' },
  tuesday: { open: '00:00', close: '23:59' },
  wednesday: { open: '00:00', close: '23:59' },
  thursday: { open: '00:00', close: '23:59' },
  friday: { open: '00:00', close: '23:59' },
  saturday: { open: '00:00', close: '23:59' },
  sunday: { open: '00:00', close: '23:59' },
})

export default async function globalSetup(config: FullConfig) {
  // Save current config for teardown
  const row = psql("SELECT ordering_enabled, opening_hours, ordering_hours FROM restaurant_config WHERE id = TRUE")
  const [enabled, openingHours, orderingHours] = row.split('|')
  writeFileSync(
    join(__dirname, '.restaurant-config-backup.json'),
    JSON.stringify({ enabled, openingHours, orderingHours }),
  )

  // Set ordering_enabled = true and both opening_hours + ordering_hours to 24/7
  psql(`UPDATE restaurant_config SET ordering_enabled = TRUE, opening_hours = '${ALL_DAY_HOURS}'::jsonb, ordering_hours = '${ALL_DAY_HOURS}'::jsonb, updated_at = NOW() WHERE id = TRUE`)

  console.log('E2E setup: restaurant ordering enabled 24/7')

  /*
   * Drive the OTP login flow ONCE here so per-test fixtures don't have to.
   * Captures oidc-client-ts localStorage entries to disk; the authenticatedPage
   * fixture replays them via addInitScript. Skip if E2E_USER_EMAIL is unset —
   * downstream auth-required tests will skip with a clear message.
   */
  const email = process.env.E2E_USER_EMAIL
  if (!email) {
    console.warn('E2E setup: E2E_USER_EMAIL not set, skipping auth state capture (authenticated tests will skip)')
    return
  }

  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000'

  const browser = await chromium.launch()
  try {
    const ctx = await browser.newContext({ baseURL, locale: 'fr-BE' })
    const page = await ctx.newPage()
    const state = await loginViaOtpAndCaptureState(page, baseURL, email)
    writeFileSync(
      join(__dirname, '.auth-state.json'),
      JSON.stringify(state),
    )
    console.log(`E2E setup: captured OIDC state for ${email} (${state.entries.length} localStorage entries)`)
  } catch (e) {
    console.error('E2E setup: OTP login failed —', e instanceof Error ? e.message : e)
    throw e
  } finally {
    await browser.close()
  }
}
