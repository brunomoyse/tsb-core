import { dirname, join } from 'node:path'
import { readFileSync, unlinkSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const DB_HOST = process.env.DB_HOST || 'localhost'
const DB_PORT = process.env.DB_PORT || '15432'
const DB_USER = process.env.DB_USERNAME || 'brunomoyse'
const DB_PASS = process.env.DB_PASSWORD || 'k5zQuoJNG1Vdre8kiNnaWrjajnyAnvF'
const DB_NAME = process.env.DB_DATABASE || 'tokyosushi'

function psql(sql: string): void {
  execSync(
    `PGPASSWORD='${DB_PASS}' psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -c "${sql.replace(/"/g, '\\"')}"`,
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
}
