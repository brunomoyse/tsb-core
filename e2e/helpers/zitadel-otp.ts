/*
 * Zitadel OTP retrieval for e2e — bypasses the email channel by reading the
 * encrypted OTP code straight from Zitadel's event store and decrypting it
 * with the instance master key.
 *
 * Why: the e2e flow lands on the test domain (tsb.brunomoyse.be) because
 * Zitadel's loginUI is configured there globally, which means the test
 * tsb-service sends the OTP via its own Scaleway sender — a local Mailpit
 * never sees it. The event store is the only place we can recover the code
 * after the fact.
 *
 * Format details (verified against zitadel v4.15.0 internal/crypto/aes.go):
 *   - system.encryption_keys.key holds `EncryptAESString(plain, masterkey)`:
 *     base64url(IV(16) || ciphertext) with AES-CFB.
 *   - eventstore.events2 payload `.code.Crypted` holds
 *     base64std(IV(16) || ciphertext) with the same AES-CFB algorithm,
 *     keyed by the decrypted userKey (32 bytes for AES-256).
 *
 * All env vars are required (no in-code defaults): see helpers/db-env.ts.
 */

import { createDecipheriv } from 'node:crypto'
import { dbEnv } from './db-env'
import { execSync } from 'node:child_process'

const IV_SIZE = 16

let cachedUserKey: Buffer | null = null

function psql(sql: string): string {
    return execSync(
        `PGPASSWORD='${dbEnv.DB_PASS}' psql -h ${dbEnv.DB_HOST} -p ${dbEnv.DB_PORT} -U ${dbEnv.DB_USER} -d ${dbEnv.ZITADEL_DB} -t -A -F '|' -c "${sql.replace(/"/gu, '\\"')}"`,
        { encoding: 'utf-8' },
    ).trim()
}

function decryptAesCfb(blob: Buffer, key: Buffer): Buffer {
    if (blob.length < IV_SIZE) {
        throw new Error(`ciphertext too short: ${blob.length}`)
    }
    const iv = blob.subarray(0, IV_SIZE)
    const ct = blob.subarray(IV_SIZE)
    const algo = `aes-${key.length * 8}-cfb`
    const decipher = createDecipheriv(algo, key, iv)
    return Buffer.concat([decipher.update(ct), decipher.final()])
}

function loadUserKey(): Buffer {
    if (cachedUserKey) return cachedUserKey
    const encrypted = psql("SELECT key FROM system.encryption_keys WHERE id = 'userKey'")
    if (!encrypted) throw new Error('userKey not found in system.encryption_keys')
    const wrapped = Buffer.from(encrypted, 'base64url')
    const plain = decryptAesCfb(wrapped, Buffer.from(dbEnv.ZITADEL_MASTERKEY))
    if (plain.length !== 16 && plain.length !== 24 && plain.length !== 32) {
        throw new Error(`decrypted userKey has unexpected length: ${plain.length}`)
    }
    cachedUserKey = plain
    return plain
}

/*
 * Poll Zitadel's event store until an `otp.email.challenged` event lands for
 * a session whose `user.checked` payload references the given email's user id.
 * Returns the decrypted plaintext OTP (typically 6 digits).
 *
 * The `after` cutoff prevents us from picking up an OTP from a previous run
 * for the same user (codes are valid 5 min in zitadel default config).
 */
export async function waitForOtpFromZitadel(
    email: string,
    opts: { timeoutMs?: number; pollMs?: number; after?: Date } = {},
): Promise<string> {
    const timeoutMs = opts.timeoutMs ?? 20_000
    const pollMs = opts.pollMs ?? 500
    const after = opts.after ?? new Date()
    const afterIso = after.toISOString()
    const deadline = Date.now() + timeoutMs
    const userKey = loadUserKey()

    /*
     * Resolve user id once up front. If the address is brand new the lookup
     * may return empty on the first poll because the placeholder-account
     * creation in tsb-service races the OTP request slightly — keep retrying
     * until either id or deadline.
     */
    let userId = ''
    while (Date.now() < deadline) {
        userId = psql(
            `SELECT user_id FROM projections.users14_humans WHERE lower(email) = lower('${email.replace(/'/gu, "''")}') LIMIT 1`,
        )
        if (userId) break
        await new Promise<void>((r) => { setTimeout(r, pollMs) })
    }
    if (!userId) {
        throw new Error(`No zitadel user found for email ${email} within ${timeoutMs}ms`)
    }

    while (Date.now() < deadline) {
        /*
         * Join via session aggregate id: the user.checked event tells us
         * which session belongs to the user; the otp.email.challenged event
         * on that same session carries the encrypted code.
         */
        const rows = psql(
            `SELECT c.payload->'code'->>'Crypted'
             FROM eventstore.events2 uc
             JOIN eventstore.events2 c
               ON c.aggregate_type = 'session'
              AND c.aggregate_id = uc.aggregate_id
              AND c.event_type = 'session.otp.email.challenged'
              AND c.created_at >= uc.created_at
             WHERE uc.aggregate_type = 'session'
               AND uc.event_type = 'session.user.checked'
               AND uc.payload->>'userID' = '${userId}'
               AND uc.created_at > '${afterIso}'
             ORDER BY c.created_at DESC
             LIMIT 1`,
        )
        if (rows) {
            const crypted = Buffer.from(rows, 'base64')
            const plain = decryptAesCfb(crypted, userKey).toString('utf-8')
            if (/^\d{4,10}$/u.test(plain)) return plain
            throw new Error(`Decrypted OTP failed sanity check: ${JSON.stringify(plain)}`)
        }
        await new Promise<void>((r) => { setTimeout(r, pollMs) })
    }

    throw new Error(
        `Timed out after ${timeoutMs}ms waiting for zitadel otp event for ${email} (userID=${userId}, after=${afterIso})`,
    )
}
