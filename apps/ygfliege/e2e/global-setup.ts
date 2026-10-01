/*
 * Forces ordering open for the run, so the suites don't depend on the wall
 * clock (the seeded YGF hours are 11:30 to 22:00). The previous config is
 * backed up and restored by global-teardown.
 *
 * Auth is opt-in: set YGF_E2E_USER_EMAIL (plus the DB_* and ZITADEL_* vars from
 * layers/engine/e2e/support/db-env.ts, pointing at the Zitadel this app uses)
 * to run the logged-in engine specs. Without it they skip. It is a separate
 * var from tokyosushi's E2E_USER_EMAIL so `npm run test:e2e:all` in one shell
 * never tries a YGF login against a Zitadel that isn't set up for it.
 */
import type { FullConfig } from '@playwright/test'
import { captureAuthState } from '../../../layers/engine/e2e/support/global-auth'
import { forceOrderingOpen } from '../../../layers/engine/e2e/support/restaurant-config'
import { ygfDb } from './db-target'

export default async function globalSetup(config: FullConfig) {
    forceOrderingOpen(ygfDb(), config.configFile)
    console.log('ygfliege e2e setup: ordering forced open 24/7 (previous config backed up)')

    await captureAuthState(config, process.env.YGF_E2E_USER_EMAIL, 'ygfliege e2e setup')
}
