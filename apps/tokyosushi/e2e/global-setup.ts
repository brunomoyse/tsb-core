import type { FullConfig } from '@playwright/test'
import { captureAuthState } from '../../../layers/engine/e2e/support/global-auth'
import { forceOrderingOpen } from '../../../layers/engine/e2e/support/restaurant-config'
import { tsbDb } from './db-target'

export default async function globalSetup(config: FullConfig) {
  forceOrderingOpen(tsbDb(), config.configFile)
  console.log('E2E setup: restaurant ordering enabled 24/7')

  await captureAuthState(config, process.env.E2E_USER_EMAIL, 'E2E setup')
}
