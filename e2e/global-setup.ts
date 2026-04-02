import { dirname, join } from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { writeFileSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const DB_HOST = process.env.DB_HOST || 'localhost'
const DB_PORT = process.env.DB_PORT || '15432'
const DB_USER = process.env.DB_USERNAME || 'brunomoyse'
const DB_PASS = process.env.DB_PASSWORD || 'k5zQuoJNG1Vdre8kiNnaWrjajnyAnvF'
const DB_NAME = process.env.DB_DATABASE || 'tokyosushi'

function psql(sql: string): string {
  return execSync(
    `PGPASSWORD='${DB_PASS}' psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -t -A -c "${sql.replace(/"/g, '\\"')}"`,
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

export default function globalSetup() {
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
}
