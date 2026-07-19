/*
 * Restaurant-config plumbing for the ygfliege e2e suite.
 *
 * The compose-a-bowl flow needs ordering to be OPEN: ProductModal's
 * `canAddToCart` short-circuits on `orderingDisabled`, so outside the seeded
 * 11:30–22:00 window the add-to-cart button never enables and every test
 * fails. global-setup forces 24/7 hours; global-teardown restores them.
 *
 * Connection: prefers a direct `psql` when YGF_E2E_DB_HOST/PORT/USER/PASSWORD
 * are set, otherwise shells into the local dev Postgres container, which needs
 * no credentials. Deliberately no hardcoded password — see the note in
 * apps/tokyosushi/e2e/helpers/db-env.ts.
 *
 * SQL is piped over stdin rather than `-c "..."`, so JSON payloads full of
 * quotes can never break out into the shell.
 */
import { execFileSync } from 'node:child_process'

const DB_NAME = process.env.YGF_E2E_DB_NAME || 'ygfliege'
// Local dev container published on 15433 (see the ygfliege .env.example).
const PG_CONTAINER = process.env.YGF_E2E_PG_CONTAINER || 'pocketpair-postgres'

const directHost = process.env.YGF_E2E_DB_HOST
const directPort = process.env.YGF_E2E_DB_PORT
const directUser = process.env.YGF_E2E_DB_USER
const directPass = process.env.YGF_E2E_DB_PASSWORD

const useDirectPsql = Boolean(directHost && directPort && directUser && directPass)

export function psql(sql: string): string {
    if (useDirectPsql) {
        return execFileSync(
            'psql',
            ['-h', directHost!, '-p', directPort!, '-U', directUser!, '-d', DB_NAME, '-t', '-A'],
            { encoding: 'utf-8', input: sql, env: { ...process.env, PGPASSWORD: directPass! } },
        ).trim()
    }
    return execFileSync(
        'docker',
        ['exec', '-i', PG_CONTAINER, 'psql', '-U', 'postgres', '-d', DB_NAME, '-t', '-A'],
        { encoding: 'utf-8', input: sql },
    ).trim()
}

/** Every day open 00:00–23:59, matching the tokyosushi e2e suite. */
export const ALL_DAY_HOURS = JSON.stringify(
    Object.fromEntries(
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => [
            day,
            { open: '00:00', close: '23:59' },
        ]),
    ),
)

export interface RestaurantConfigBackup {
    ordering_enabled: boolean
    opening_hours: unknown
    ordering_hours: unknown
}

/** Snapshot the columns global-setup overwrites, as a single JSON row. */
export function readConfig(): RestaurantConfigBackup {
    const row = psql(
        `SELECT json_build_object(
            'ordering_enabled', ordering_enabled,
            'opening_hours', opening_hours,
            'ordering_hours', ordering_hours
         ) FROM restaurant_config WHERE id = TRUE;`,
    )
    if (!row) throw new Error('ygfliege e2e: restaurant_config row not found')
    return JSON.parse(row) as RestaurantConfigBackup
}

export function writeConfig(cfg: RestaurantConfigBackup): void {
    // ordering_hours is nullable; opening_hours is not.
    const orderingHours = cfg.ordering_hours === null ? 'NULL' : `'${JSON.stringify(cfg.ordering_hours)}'::jsonb`
    psql(
        `UPDATE restaurant_config SET
            ordering_enabled = ${cfg.ordering_enabled},
            opening_hours = '${JSON.stringify(cfg.opening_hours)}'::jsonb,
            ordering_hours = ${orderingHours},
            updated_at = NOW()
         WHERE id = TRUE;`,
    )
}
