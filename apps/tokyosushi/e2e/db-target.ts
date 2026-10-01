import type { PgTarget } from '../../../layers/engine/e2e/support/restaurant-config'
import { getDbEnv } from '../../../layers/engine/e2e/support/db-env'

/** Tokyo Sushi e2e runs against the test server DB through the SSH tunnel (DB_* vars). */
export function tsbDb(): PgTarget {
  const env = getDbEnv()
  return {
    kind: 'direct',
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASS,
    database: env.DB_NAME,
  }
}
