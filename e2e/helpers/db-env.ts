/*
 * Centralised env loader for the e2e DB tunnel + Zitadel decryption.
 *
 * Every value here is required — no in-code defaults. Hardcoded fallbacks
 * for a connection password were previously committed to a public repo
 * and burned through a rotation; do not re-introduce them, even for the
 * "boring" fields like host/db/user, since they document the deployment
 * topology of a private system.
 *
 * Read once at module import; consumers re-use the cached object. Throws
 * synchronously on missing vars with a single message listing all gaps.
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

export const dbEnv = load()
