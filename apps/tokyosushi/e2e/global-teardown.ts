import { dirname, join } from 'node:path'
import { existsSync, readFileSync, unlinkSync } from 'node:fs'
import { dbEnv } from './helpers/db-env'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function psql(sql: string): void {
  execSync(
    `PGPASSWORD='${dbEnv.DB_PASS}' psql -h ${dbEnv.DB_HOST} -p ${dbEnv.DB_PORT} -U ${dbEnv.DB_USER} -d ${dbEnv.DB_NAME} -c "${sql.replace(/"/gu, '\\"')}"`,
    { encoding: 'utf-8' },
  )
}

export default function globalTeardown() {
  const backupPath = join(__dirname, '.restaurant-config-backup.json')
  try {
    const backup = JSON.parse(readFileSync(backupPath, 'utf-8'))

    // Restore original opening_hours and ordering_hours (ordering_hours may be null)
    const orderingHoursValue = backup.orderingHours === '' ? 'NULL' : `'${backup.orderingHours}'::jsonb`
    psql(`UPDATE restaurant_config SET ordering_enabled = ${backup.enabled === 't'}, opening_hours = '${backup.openingHours}'::jsonb, ordering_hours = ${orderingHoursValue}, updated_at = NOW() WHERE id = TRUE`)

    unlinkSync(backupPath)
    console.log('E2E teardown: restaurant config restored')
  } catch {
    console.warn('E2E teardown: no backup found, skipping restore')
  }

  // Drop captured OIDC state so the next run is forced to re-authenticate (token TTL is ~1h)
  const authStatePath = join(__dirname, '.auth-state.json')
  if (existsSync(authStatePath)) {
    unlinkSync(authStatePath)
  }
}
