/*
 * Mirror of `tsb-service/pkg/money/rounding.go`. The backend is the source of
 * truth; this helper exists so the cart can preview the same total the user
 * will be charged. Keep behaviour identical (see backend Go tests for spec).
 */

/**
 * Rounds an EUR amount to the nearest 0,10 €. Inputs whose last cent digit
 * is 0 stay unchanged; 1–4 round down, 5–9 round up — so 0,05 € ties always
 * resolve in favour of the restaurant.
 *
 * Examples:
 *   24.42 → 24.40   (.x2 down)
 *   24.45 → 24.50   (.x5 tie → up)
 *   12.93 → 12.90   (.x3 down)
 *   12.95 → 13.00   (.x5 tie → up, carries)
 *
 * Idempotent: roundToNearest10Cents(roundToNearest10Cents(x)) === roundToNearest10Cents(x).
 */
export function roundToNearest10Cents(eur: number): number {
  if (!Number.isFinite(eur)) return eur

  const sign = eur < 0 ? -1 : 1
  const cents = Math.round(Math.abs(eur) * 100)
  const last = cents % 10

  let rounded: number
  if (last === 0) {
    rounded = cents
  } else if (last <= 4) {
    rounded = cents - last
  } else {
    rounded = cents + (10 - last)
  }

  // Normalise -0 → 0 so callers comparing with === 0 behave intuitively.
  if (rounded === 0) return 0
  return (sign * rounded) / 100
}
