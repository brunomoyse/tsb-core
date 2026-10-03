/*
 * Single source of the line-pricing formula for every cart / product surface.
 * Mirror of `orderDomain.PriceLine` in `tsb-service/internal/modules/order/domain/pricing.go`
 * (the backend is the source of truth; parity is pinned by `pricing.test.mjs`).
 *
 *   lineTotal = base × qty + Σ(max(modifier, 0) × selectionQty)
 *
 * Selection quantities are line-wide: the group min/max are multiplied by the
 * line quantity, so 2 bowls need 2 broths and the 2 is the broth's selection
 * quantity. The surcharge is therefore NOT multiplied by the line quantity
 * again (it used to be, which charged 2 bowls with a 1.50 broth 6.00 of
 * surcharge instead of 3.00 — audit finding M2).
 *
 * All arithmetic is in integer cents; callers sum cents and format once at display time
 * (`formatCents`), so summing lines never accumulates float error.
 */

import { type MoneyLike, toCents } from './money.ts'

// `toCents` lives in money.ts; re-exported because pricing is where most callers look for it.
export { toCents }

/** A selection with its price modifier. `quantity` is the TOTAL on the line, not per unit. */
export interface PricedSelection {
  modifier: MoneyLike
  quantity: number
}

/** What the line helpers need from a cart item (structurally satisfied by `CartItem`). */
export interface PriceableLine {
  quantity: number
  product: {
    price: MoneyLike
    choices?: { id: string; priceModifier: MoneyLike }[] | null
  }
  selectedChoices?: { choiceId: string; quantity: number }[] | null
  /** Legacy single choice, only used when `selectedChoices` is empty. */
  selectedChoice?: { priceModifier: MoneyLike } | null
}

export interface PricedLine {
  /** Authoritative line amount in cents. */
  lineTotalCents: number
  /**
   * The line total divided by qty, rounded half-up to the cent: what the backend stores in
   * order_product.unit_price. Display-only: unitPriceCents × qty can differ
   * from lineTotalCents by a few cents, so never multiply it back.
   */
  unitPriceCents: number
}

/** The formula itself. Negative modifiers are clamped to 0 (a choice never discounts). */
export function priceLine(
  base: MoneyLike,
  qty: number,
  selections: PricedSelection[] = [],
): PricedLine {
  let lineTotalCents = toCents(base) * qty
  for (const selection of selections) {
    lineTotalCents += Math.max(toCents(selection.modifier), 0) * selection.quantity
  }
  const unitPriceCents =
    qty > 0 ? Math.floor((2 * lineTotalCents + qty) / (2 * qty)) : toCents(base)
  return { lineTotalCents, unitPriceCents }
}

const selectionsOf = (item: PriceableLine): PricedSelection[] => {
  const selections = item.selectedChoices ?? []
  if (selections.length > 0) {
    const choiceMap = new Map((item.product.choices ?? []).map((choice) => [choice.id, choice]))
    return selections.flatMap((selection) => {
      const choice = choiceMap.get(selection.choiceId)
      return choice ? [{ modifier: choice.priceModifier, quantity: selection.quantity }] : []
    })
  }
  // Legacy single choice (pre multi-select carts): it applies to every unit of the line.
  if (item.selectedChoice)
    return [{ modifier: item.selectedChoice.priceModifier, quantity: item.quantity }]
  return []
}

export const priceCartLine = (item: PriceableLine): PricedLine =>
  priceLine(item.product.price, item.quantity, selectionsOf(item))

/** Line amount in cents — sum these, divide once. */
export const lineTotalCents = (item: PriceableLine): number => priceCartLine(item).lineTotalCents

/**
 * Average price of one unit of the line (lineTotal / qty, rounded to the cent), in cents.
 * Fine for a "price" headline; use `lineTotalCents` for anything that must add up.
 */
export const unitPriceCents = (item: PriceableLine): number => priceCartLine(item).unitPriceCents

/**
 * Per-unit price in cents only when it multiplies back to the line total exactly, else
 * null. Use it for "2 × €13.50" sub-lines, which must never contradict the total.
 */
export const exactUnitPriceCents = (item: PriceableLine): number | null => {
  const { lineTotalCents: total } = priceCartLine(item)
  return item.quantity > 0 && total % item.quantity === 0 ? total / item.quantity : null
}
