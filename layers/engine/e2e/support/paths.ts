import { dirname, join } from 'node:path'

/*
 * Per-app e2e temp files. Each brand app runs its own Playwright config, so state lives next to
 * that config (apps/<brand>/e2e/), never in the shared engine folder where two apps would clash.
 */
const appE2eDir = (configFile: string | undefined) =>
  join(configFile ? dirname(configFile) : process.cwd(), 'e2e')

export const authStateFile = (configFile: string | undefined) =>
  join(appE2eDir(configFile), '.auth-state.json')

export const restaurantConfigBackupFile = (configFile: string | undefined) =>
  join(appE2eDir(configFile), '.restaurant-config-backup.json')
