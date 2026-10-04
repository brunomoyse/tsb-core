import { toCents } from './money.ts'

/*
 * The optional "how much will you pay with?" amount of a cash order (audit M25). The backend only
 * rejects a negative amount, so an amount BELOW the total used to go through silently and the courier
 * arrived without enough information to bring change. The checkout shows the state below and does not
 * let the order go with a short amount.
 */
export type CashAmountState =
  /** Nothing entered: the field is optional. */
  | { kind: 'none' }
  /** Less than what is due (or not an amount): must be corrected. */
  | { kind: 'short'; missingCents: number }
  | { kind: 'exact' }
  /** More than due: the change the courier / counter has to bring back. */
  | { kind: 'change'; changeCents: number }

export function evaluateCashAmount(
  raw: string | number | null | undefined,
  payableCents: number,
): CashAmountState {
  const text = String(raw ?? '').trim()
  if (text === '') return { kind: 'none' }
  const amount = toCents(text.replace(',', '.'))
  if (amount < payableCents || amount <= 0)
    return { kind: 'short', missingCents: Math.max(payableCents - amount, 0) }
  if (amount === payableCents) return { kind: 'exact' }
  return { kind: 'change', changeCents: amount - payableCents }
}

/**
 * What the cash amount field keeps of what was typed: a decimal comma becomes a point, only digits and up to two
 * decimals survive, and nothing left means no amount (null).
 */
export function sanitizeCashAmount(value: string | number | null | undefined): string | null {
  if (value === '' || value === null || value === undefined) return null
  // The pattern matches any text (every part is optional and `.*` takes the rest): digits, then at most 2 decimals.
  const sanitized = String(value)
    .replace(',', '.')
    .replace(/^(\d*)(\.\d{0,2})?.*$/su, '$1$2')
  return sanitized === '' ? null : sanitized
}
