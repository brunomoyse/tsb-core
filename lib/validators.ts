/**
 * Lightweight client-side validators. The backend remains the source of truth;
 * these helpers only short-circuit obviously bad input before submit so the
 * user gets feedback without a round trip.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value: string): boolean {
    return EMAIL_RE.test(value.trim())
}
