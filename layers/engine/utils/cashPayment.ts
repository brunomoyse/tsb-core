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
