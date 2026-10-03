/*
 * Restaurant-config plumbing shared by every brand's e2e global setup/teardown.
 *
 * Most flows need ordering to be OPEN: outside the configured hours add-to-cart
 * stays disabled and checkout shows the closed banner, so suites would only
 * pass at certain times of day. Setup forces 24/7 hours and backs up the
 * previous values next to the app's playwright config; teardown restores them.
 * Leaving 24/7 behind would silently mask the "closed" UI states in dev.
 *
 * Each app picks how to reach its DB (`PgTarget`): a direct psql connection,
 * or `docker exec` into a local Postgres container (needs no credentials).
 * Deliberately no hardcoded password; see the note in support/db-env.ts.
 *
 * SQL is piped over stdin rather than `-c "..."`, so JSON payloads full of
 * quotes can never break out into the shell.
 */
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { restaurantConfigBackupFile } from './paths'

export type PgTarget =
  | { kind: 'direct'; host: string; port: string; user: string; password: string; database: string }
  | { kind: 'docker'; container: string; database: string }

export function psql(target: PgTarget, sql: string): string {
  if (target.kind === 'direct') {
    return execFileSync(
      'psql',
      ['-h', target.host, '-p', target.port, '-U', target.user, '-d', target.database, '-t', '-A'],
      { encoding: 'utf-8', input: sql, env: { ...process.env, PGPASSWORD: target.password } },
    ).trim()
  }
  return execFileSync(
    'docker',
    ['exec', '-i', target.container, 'psql', '-U', 'postgres', '-d', target.database, '-t', '-A'],
    { encoding: 'utf-8', input: sql },
  ).trim()
}

/** Every day open 00:00 to 23:59. */
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

/** Snapshot the columns forceOrderingOpen overwrites, as a single JSON row. */
export function readConfig(target: PgTarget): RestaurantConfigBackup {
  const row = psql(
    target,
    `SELECT json_build_object(
            'ordering_enabled', ordering_enabled,
            'opening_hours', opening_hours,
            'ordering_hours', ordering_hours
         ) FROM restaurant_config WHERE id = TRUE;`,
  )
  if (!row) throw new Error('e2e: restaurant_config row not found')
  return JSON.parse(row) as RestaurantConfigBackup
}

export function writeConfig(target: PgTarget, cfg: RestaurantConfigBackup): void {
  // ordering_hours is nullable; opening_hours is not.
  const orderingHours =
    cfg.ordering_hours === null ? 'NULL' : `'${JSON.stringify(cfg.ordering_hours)}'::jsonb`
  psql(
    target,
    `UPDATE restaurant_config SET
            ordering_enabled = ${cfg.ordering_enabled},
            opening_hours = '${JSON.stringify(cfg.opening_hours)}'::jsonb,
            ordering_hours = ${orderingHours},
            updated_at = NOW()
         WHERE id = TRUE;`,
  )
}

/** Back up the current config next to the app's playwright config, then open 24/7. */
export function forceOrderingOpen(target: PgTarget, configFile: string | undefined): void {
  const backupFile = restaurantConfigBackupFile(configFile)
  // A leftover backup means the last run never reached teardown: it holds the real config,
  // while the DB still holds our 24/7 override. Keep it rather than backing up the override.
  if (!existsSync(backupFile)) {
    writeFileSync(backupFile, JSON.stringify(readConfig(target)), 'utf-8')
  }
  writeConfig(target, {
    ordering_enabled: true,
    opening_hours: JSON.parse(ALL_DAY_HOURS),
    ordering_hours: JSON.parse(ALL_DAY_HOURS),
  })
}

/** Restore the config saved by forceOrderingOpen. Returns false when there was nothing to restore. */
export function restoreRestaurantConfig(target: PgTarget, configFile: string | undefined): boolean {
  const backupFile = restaurantConfigBackupFile(configFile)
  if (!existsSync(backupFile)) return false
  writeConfig(target, JSON.parse(readFileSync(backupFile, 'utf-8')) as RestaurantConfigBackup)
  unlinkSync(backupFile)
  return true
}
