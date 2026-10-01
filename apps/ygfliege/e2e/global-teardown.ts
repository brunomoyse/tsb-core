/*
 * Restores the restaurant_config that global-setup overwrote. Leaving 24/7
 * hours behind would silently mask the "closed" UI states in local dev.
 */
import type { FullConfig } from '@playwright/test'
import { clearAuthState } from '../../../layers/engine/e2e/support/global-auth'
import { restoreRestaurantConfig } from '../../../layers/engine/e2e/support/restaurant-config'
import { ygfDb } from './db-target'

export default function globalTeardown(config: FullConfig) {
    if (restoreRestaurantConfig(ygfDb(), config.configFile)) {
        console.log('ygfliege e2e teardown: restaurant config restored')
    } else {
        console.warn('ygfliege e2e teardown: no backup found, skipping restore')
    }
    clearAuthState(config)
}
