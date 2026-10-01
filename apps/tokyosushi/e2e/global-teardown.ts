import type { FullConfig } from '@playwright/test'
import { clearAuthState } from '../../../layers/engine/e2e/support/global-auth'
import { restoreRestaurantConfig } from '../../../layers/engine/e2e/support/restaurant-config'
import { tsbDb } from './db-target'

export default function globalTeardown(config: FullConfig) {
  if (restoreRestaurantConfig(tsbDb(), config.configFile)) {
    console.log('E2E teardown: restaurant config restored')
  } else {
    console.warn('E2E teardown: no backup found, skipping restore')
  }
  clearAuthState(config)
}
