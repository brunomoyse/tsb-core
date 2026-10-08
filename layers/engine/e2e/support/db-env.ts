/*
 * Centralised env loader for the e2e DB tunnel + Zitadel decryption.
 *
 * Every value here is required; no in-code defaults. Hardcoded fallbacks
 * for a connection password were previously committed to a public repo
 * and burned through a rotation; do not re-introduce them, even for the
 * "boring" fields like host/db/user, since they document the deployment
 * topology of a private system.
 *
 * Read lazily on first use, then cached. Throws on missing vars with a
 * single message listing all gaps. Lazy so that importing a spec that only
 * *may* need the DB (e.g. auth.spec.ts on a brand without e2e auth set up)
 * skips cleanly instead of failing at module load.
 */

function requireVar(name: string, value: string | undefined, errs: string[]): string {
  if (!value) {
    errs.push(name)
    return ''
  }
  return value
}

interface DbEnv {
  DB_HOST: string
  DB_PORT: string
  DB_USER: string
  DB_PASS: string
  DB_NAME: string
  ZITADEL_DB: string
  ZITADEL_MASTERKEY: string
}

function load(): DbEnv {
  const errs: string[] = []
  const env: DbEnv = {
    DB_HOST: requireVar('DB_HOST', process.env.DB_HOST, errs),
    DB_PORT: requireVar('DB_PORT', process.env.DB_PORT, errs),
    DB_USER: requireVar('DB_USERNAME', process.env.DB_USERNAME, errs),
    DB_PASS: requireVar('DB_PASSWORD', process.env.DB_PASSWORD, errs),
    DB_NAME: requireVar('DB_DATABASE', process.env.DB_DATABASE, errs),
    ZITADEL_DB: requireVar('ZITADEL_DB', process.env.ZITADEL_DB, errs),
    ZITADEL_MASTERKEY: requireVar('ZITADEL_MASTERKEY', process.env.ZITADEL_MASTERKEY, errs),
  }
  if (errs.length > 0) {
    throw new Error(
      `Missing e2e env vars: ${errs.join(', ')}. Source your e2e profile or copy from your secrets vault.`,
    )
  }
  return env
}

let cached: DbEnv | null = null

export function getDbEnv(): DbEnv {
  cached ??= load()
  return cached
}
