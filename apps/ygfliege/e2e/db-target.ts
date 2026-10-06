import type { PgTarget } from '../../../layers/engine/e2e/support/restaurant-config'

/*
 * YGF e2e runs against the local dev stack (tsb-service on :8081, `ygfliege` DB seeded from
 * tsb-service/seeds/ygfliege_menu.sql). Direct psql when YGF_E2E_DB_HOST/PORT/USER/PASSWORD are
 * set, otherwise `docker exec` into the local dev Postgres container, which needs no credentials.
 */
/** The env value, or the fallback when it is unset or empty. */
const nonEmpty = (value: string | undefined, fallback: string): string =>
  value === undefined || value === '' ? fallback : value

export function ygfDb(): PgTarget {
  const database = nonEmpty(process.env.YGF_E2E_DB_NAME, 'ygfliege')
  const {
    YGF_E2E_DB_HOST: host,
    YGF_E2E_DB_PORT: port,
    YGF_E2E_DB_USER: user,
    YGF_E2E_DB_PASSWORD: password,
  } = process.env
  if (host && port && user && password) {
    return { kind: 'direct', host, port, user, password, database }
  }
  // Local dev container published on 15433 (see the ygfliege .env.example).
  return {
    kind: 'docker',
    container: nonEmpty(process.env.YGF_E2E_PG_CONTAINER, 'pocketpair-postgres'),
    database,
  }
}
