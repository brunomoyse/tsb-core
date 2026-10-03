import type { QuoteLine, QuoteLineIssue } from './orderQuote.ts'

/*
 * What a cart line does with an issue of the server quote: the message to show and the actions the
 * customer can take. Pure (no i18n, no store): the line component translates `messageKey` and runs
 * the actions; `cartIssues.test.mjs` pins the mapping.
 *
 * Every line issue blocks the payment (see `isQuoteBlocking`); each one has at least one action
 * that resolves it.
 */

export type LineIssueAction =
  /** Remove the line from the cart. */
  | 'remove'
  /** Take today's price: the stored snapshot is rewritten and the quote asked again. */
  | 'accept-price'
  /** Go to the time slot picker of the checkout (lunch-only product, slot is not a weekday lunch slot). */
  | 'choose-slot'

export interface LineIssueView {
  code: string
  /** The vue-i18n key (engine locales, `cart.issues.*`). */
  messageKey: string
  /** Params of the message; money as integer cents (the component formats them). */
  params: { fromCents?: number; toCents?: number }
  /** In the order they are offered: the first is the primary one. */
  actions: LineIssueAction[]
}

const REMOVE: LineIssueAction[] = ['remove']

/**
 * @param issue the issue of the quote line
 * @param shownLineTotalCents what the cart currently shows for the line (the "from" of a price change)
 * @param quotedLineTotalCents what the server now charges for the line (the "to")
 */
export function describeLineIssue(
  issue: QuoteLineIssue,
  shownLineTotalCents: number,
  quotedLineTotalCents: number,
): LineIssueView {
  switch (issue.code) {
    case 'PRODUCT_NOT_FOUND':
      return { code: issue.code, messageKey: 'cart.issues.notFound', params: {}, actions: REMOVE }
    case 'PRODUCT_UNAVAILABLE':
      return {
        code: issue.code,
        messageKey: 'cart.issues.unavailable',
        params: {},
        actions: REMOVE,
      }
    case 'INVALID_QUANTITY':
      return {
        code: issue.code,
        messageKey: 'cart.issues.invalidQuantity',
        params: {},
        actions: REMOVE,
      }
    case 'SELECTION_INVALID':
      // A choice that is gone or a group whose rules changed: the line has to be composed again from the menu.
      return {
        code: issue.code,
        messageKey: 'cart.issues.selectionInvalid',
        params: {},
        actions: REMOVE,
      }
    case 'LUNCH_SLOT_REQUIRED':
      return {
        code: issue.code,
        messageKey: 'cart.issues.lunchOnly',
        params: {},
        actions: ['choose-slot', 'remove'],
      }
    case 'PRICE_CHANGED':
      return {
        code: issue.code,
        messageKey: 'cart.issues.priceChanged',
        params: { fromCents: shownLineTotalCents, toCents: quotedLineTotalCents },
        actions: ['accept-price', 'remove'],
      }
    default:
      // INVALID_PRICE, or a code a newer backend added: the line cannot be ordered as it is.
      return { code: issue.code, messageKey: 'cart.issues.generic', params: {}, actions: REMOVE }
  }
}

/** The issues of a line, the most blocking first (a gone product before a price change). */
const PRIORITY = [
  'PRODUCT_NOT_FOUND',
  'PRODUCT_UNAVAILABLE',
  'INVALID_QUANTITY',
  'SELECTION_INVALID',
  'INVALID_PRICE',
  'LUNCH_SLOT_REQUIRED',
  'PRICE_CHANGED',
]

export function describeLineIssues(
  issues: QuoteLineIssue[],
  shownLineTotalCents: number,
  quotedLineTotalCents: number,
): LineIssueView[] {
  const rank = (code: string) => {
    const index = PRIORITY.indexOf(code)
    return index === -1 ? PRIORITY.length : index
  }
  return issues
    .toSorted((a, b) => rank(a.code) - rank(b.code))
    .map((issue) => describeLineIssue(issue, shownLineTotalCents, quotedLineTotalCents))
}

// ---------------------------------------------------------------------------------------------
// Accepting a new price
// ---------------------------------------------------------------------------------------------

export interface SnapshotPricing {
  price: string
  /** Every choice the snapshot should carry: its own (repriced) and the ones the quote priced that it was missing. */
  choices: { id: string; priceModifier: string; groupId?: string }[]
}

/**
 * The prices the stored snapshot takes when the customer accepts the quote: the product's current
 * price and the current price modifier of each choice the quote priced. Only the PRICES move; names
 * and everything else of the snapshot stay. A selected choice the snapshot does not have (an old
 * cart whose snapshot lacked it) is added from the quote (id, group, modifier; no name), otherwise the
 * client could never price it and PRICE_CHANGED would come back after every acceptance. Null when the
 * quote has no price for the product.
 */
export function quotedSnapshotPricing(
  product: { choices: { id: string; priceModifier: string }[] },
  quoteLine: Pick<QuoteLine, 'productPrice' | 'selections'>,
): SnapshotPricing | null {
  if (quoteLine.productPrice === null) return null
  const modifierOf = new Map(
    quoteLine.selections.map((selection) => [selection.choiceId, selection.priceModifier]),
  )
  const known = new Set(product.choices.map((choice) => choice.id))
  const missing = quoteLine.selections
    .filter(
      (selection, index, all) =>
        !known.has(selection.choiceId) &&
        all.findIndex((other) => other.choiceId === selection.choiceId) === index,
    )
    .map((selection) => ({
      id: selection.choiceId,
      priceModifier: selection.priceModifier,
      groupId: selection.groupId,
    }))
  return {
    price: quoteLine.productPrice,
    choices: [
      ...product.choices.map((choice) => ({
        id: choice.id,
        priceModifier: modifierOf.get(choice.id) ?? choice.priceModifier,
      })),
      ...missing,
    ],
  }
}
