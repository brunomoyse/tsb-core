/*
 * Restores the restaurant_config that global-setup overwrote. Leaving 24/7
 * hours behind would silently mask the "closed" UI states in local dev.
 */
import { readFileSync, unlinkSync } from 'node:fs'
import { type RestaurantConfigBackup, writeConfig } from './helpers/restaurant-config'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default function globalTeardown() {
    const backupPath = join(__dirname, '.restaurant-config-backup.json')
    try {
        const backup = JSON.parse(readFileSync(backupPath, 'utf-8')) as RestaurantConfigBackup
        writeConfig(backup)
        unlinkSync(backupPath)
        console.log('ygfliege e2e teardown: restaurant config restored')
    } catch {
        console.warn('ygfliege e2e teardown: no backup found, skipping restore')
    }
}
