/*
 * Forces ordering open for the run, so the compose-a-bowl suite doesn't depend
 * on the wall clock (the seeded YGF hours are 11:30–22:00). The previous
 * config is written to .restaurant-config-backup.json and restored by
 * global-teardown.
 *
 * No auth setup here: the compose-a-bowl flow is cart-only and unauthenticated.
 */
import { ALL_DAY_HOURS, psql, readConfig } from './helpers/restaurant-config'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFileSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default function globalSetup() {
    const backup = readConfig()
    writeFileSync(join(__dirname, '.restaurant-config-backup.json'), JSON.stringify(backup), 'utf-8')

    psql(
        `UPDATE restaurant_config SET
            ordering_enabled = TRUE,
            opening_hours = '${ALL_DAY_HOURS}'::jsonb,
            ordering_hours = '${ALL_DAY_HOURS}'::jsonb,
            updated_at = NOW()
         WHERE id = TRUE;`,
    )
    console.log('ygfliege e2e setup: ordering forced open 24/7 (previous config backed up)')
}
