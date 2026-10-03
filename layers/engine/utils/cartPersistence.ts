import type { CartItem, Product, ProductChoice, ProductChoiceSelection } from '../types/index.ts'
import { centsToDecimalString, toCents } from './money.ts'
import { migratePersistedLines } from './cartLines.ts'

/*
 * What the cart keeps in localStorage, and how older shapes are brought forward. Pure: the Pinia
 * store only plugs `parsePersistedCart` / `serializeCartState` in as its (de)serializer.
 *
 * DECISION (audit PR 2.4): the cart persists what IDENTIFIES a line (productId, quantity,
 * selections) plus the smallest SNAPSHOT that lets it render and be priced without the API (name,
 * code, slug, category, price in cents, the selected choices with their names and price modifiers,
 * and the two flags the checkout reads). It does not refetch products by id on load because the cart
 * has to be readable offline and before the menu query answers (the drawer, the floating bar and
 * the checkout total all render from it at hydration). The snapshot is a DISPLAY HINT, never an
 * authority: the server quote (`quoteOrder`) re-prices every line and flags the ones whose price,
 * availability or composition changed; accepting a price rewrites the snapshot.
 *
 * Versions:
 *   no `version`  v0 / v1: the whole `Product` object per line (v0 predates `selectedChoices` and
 *                 `couponDiscountCents`; v1 is the integer-cents cart of Phase 1/2.1)
 *   2             { productId, quantity, selections, choiceId, snapshot } per line
 */

export const CART_SCHEMA_VERSION = 2

export interface SnapshotChoice {
  id: string
  groupId: string
  priceModifierCents: number
  name: string
}

export interface PersistedSnapshot {
  name: string
  code: string | null
  slug: string
  priceCents: number
  pieceCount: number | null
  isDiscountable: boolean
  isLunchOnly: boolean
  category: { id: string; name: string; slug: string } | null
  /** Only the choices the line selected. */
  choices: SnapshotChoice[]
}

export interface PersistedLine {
  productId: string
  quantity: number
  selections: ProductChoiceSelection[]
  /** The legacy single choice, when the line still carries one. */
  choiceId: string | null
  snapshot: PersistedSnapshot
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const text = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback
const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.length > 0
const optionalText = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null

// ---------------------------------------------------------------------------------------------
// In-memory line <-> persisted line
// ---------------------------------------------------------------------------------------------

/** The persisted form of a cart line: identity + minimal snapshot. */
export function toPersistedLine(item: CartItem): PersistedLine {
  const { product } = item
  const wanted = new Set([
    ...(item.selectedChoices ?? []).map((selection) => selection.choiceId),
    ...(item.selectedChoice ? [item.selectedChoice.id] : []),
  ])
  const choices = (product.choices ?? [])
    .filter((choice) => wanted.has(choice.id))
    .map((choice): SnapshotChoice => ({
      id: choice.id,
      groupId: choice.choiceGroupId ?? '',
      priceModifierCents: toCents(choice.priceModifier),
      name: choice.name,
    }))
  // A legacy single choice that is not in `product.choices` still has to be able to price itself.
  if (item.selectedChoice && !choices.some((choice) => choice.id === item.selectedChoice?.id)) {
    choices.push({
      id: item.selectedChoice.id,
      groupId: item.selectedChoice.choiceGroupId ?? '',
      priceModifierCents: toCents(item.selectedChoice.priceModifier),
      name: item.selectedChoice.name,
    })
  }
  return {
    productId: product.id,
    quantity: item.quantity,
    selections: (item.selectedChoices ?? []).map((selection) => ({
      groupId: selection.groupId,
      choiceId: selection.choiceId,
      quantity: selection.quantity,
    })),
    choiceId: item.selectedChoice?.id ?? null,
    snapshot: {
      name: product.name,
      code: product.code ?? null,
      slug: product.slug ?? '',
      priceCents: toCents(product.price),
      pieceCount: product.pieceCount ?? null,
      isDiscountable: Boolean(product.isDiscountable),
      isLunchOnly: Boolean(product.isLunchOnly),
      category: product.category
        ? {
            id: product.category.id ?? product.categoryId ?? '',
            name: product.category.name ?? '',
            slug: product.category.slug ?? '',
          }
        : null,
      choices,
    },
  }
}

/** A `Product` rebuilt from a snapshot: what the cart surfaces read, with neutral defaults for the rest. */
export function productFromSnapshot(productId: string, snapshot: PersistedSnapshot): Product {
  const { category } = snapshot
  return {
    id: productId,
    categoryId: category?.id ?? '',
    category: {
      id: category?.id ?? '',
      name: category?.name ?? '',
      order: 0,
      slug: category?.slug ?? '',
      products: [],
    },
    choices: snapshot.choices.map((choice): ProductChoice => ({
      id: choice.id,
      productId,
      choiceGroupId: choice.groupId,
      priceModifier: centsToDecimalString(choice.priceModifierCents),
      sortOrder: 0,
      name: choice.name,
    })),
    code: snapshot.code,
    description: null,
    isAvailable: true,
    isDiscountable: snapshot.isDiscountable,
    isHalal: false,
    isLunchOnly: snapshot.isLunchOnly,
    isSpicy: false,
    isVegetarian: false,
    isVisible: true,
    name: snapshot.name,
    pieceCount: snapshot.pieceCount,
    price: centsToDecimalString(snapshot.priceCents),
    slug: snapshot.slug,
  }
}

export function lineFromPersisted(line: PersistedLine): CartItem {
  const product = productFromSnapshot(line.productId, line.snapshot)
  return {
    product,
    quantity: line.quantity,
    selectedChoices: line.selections.map((selection) => ({ ...selection })),
    selectedChoice: line.choiceId
      ? (product.choices.find((choice) => choice.id === line.choiceId) ?? null)
      : null,
  }
}

// ---------------------------------------------------------------------------------------------
// Validation of whatever came out of localStorage
// ---------------------------------------------------------------------------------------------

const cleanQuantity = (value: unknown, max: number): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.min(Math.max(Math.trunc(value), 1), max)
}

/** Selections of a line: all well-formed, or null (the line cannot be priced). */
function cleanSelections(value: unknown): ProductChoiceSelection[] | null {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) return null
  const selections: ProductChoiceSelection[] = []
  for (const entry of value) {
    if (!isRecord(entry) || !nonEmpty(entry.choiceId) || !nonEmpty(entry.groupId)) return null
    const { quantity } = entry
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1) return null
    selections.push({ groupId: entry.groupId, choiceId: entry.choiceId, quantity })
  }
  return selections
}

function cleanChoices(value: unknown): SnapshotChoice[] | null {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) return null
  const choices: SnapshotChoice[] = []
  for (const entry of value) {
    if (!isRecord(entry) || !nonEmpty(entry.id)) return null
    const cents = entry.priceModifierCents
    choices.push({
      id: entry.id,
      groupId: text(entry.groupId),
      priceModifierCents: typeof cents === 'number' && Number.isInteger(cents) ? cents : 0,
      name: text(entry.name),
    })
  }
  return choices
}

/** A line of the v2 shape, or null when it cannot be recovered. */
function cleanPersistedLine(value: unknown, max: number): PersistedLine | null {
  if (!isRecord(value) || !nonEmpty(value.productId) || !isRecord(value.snapshot)) return null
  const quantity = cleanQuantity(value.quantity, max)
  const selections = cleanSelections(value.selections)
  const { snapshot } = value
  const choices = cleanChoices(snapshot.choices)
  const { priceCents } = snapshot
  if (quantity === null || selections === null || choices === null) return null
  if (typeof priceCents !== 'number' || !Number.isInteger(priceCents) || priceCents < 0) return null
  if (typeof snapshot.name !== 'string') return null
  const category = isRecord(snapshot.category)
    ? {
        id: text(snapshot.category.id),
        name: text(snapshot.category.name),
        slug: text(snapshot.category.slug),
      }
    : null
  return {
    productId: value.productId,
    quantity,
    selections,
    choiceId: optionalText(value.choiceId),
    snapshot: {
      name: snapshot.name,
      code: optionalText(snapshot.code),
      slug: text(snapshot.slug),
      priceCents,
      pieceCount: typeof snapshot.pieceCount === 'number' ? snapshot.pieceCount : null,
      isDiscountable: snapshot.isDiscountable === true,
      isLunchOnly: snapshot.isLunchOnly === true,
      category,
      choices,
    },
  }
}

/**
 * A line of the v0 / v1 shape (the whole Product per line) in the in-memory form, or null when it
 * cannot be recovered. v0 carried only a single `selectedChoice` (and no `selectedChoices`): it
 * becomes a selection scaled to the line quantity, as selection quantities are line-wide (when its
 * group is unknown it stays the legacy single choice instead).
 */
function cleanLegacyLine(value: unknown, max: number): CartItem | null {
  if (!isRecord(value) || !isRecord(value.product) || !nonEmpty(value.product.id)) return null
  const { product } = value
  const quantity = cleanQuantity(value.quantity, max)
  if (quantity === null) return null
  if (typeof product.name !== 'string') return null
  if (!Number.isFinite(Number(product.price)) || product.price === null || product.price === '')
    return null

  const selectedChoice =
    isRecord(value.selectedChoice) && nonEmpty(value.selectedChoice.id)
      ? (value.selectedChoice as unknown as ProductChoice)
      : null
  let selections: ProductChoiceSelection[]
  if (Array.isArray(value.selectedChoices)) {
    const cleaned = cleanSelections(value.selectedChoices)
    if (cleaned === null) return null
    selections = cleaned
  } else if (selectedChoice && nonEmpty(selectedChoice.choiceGroupId)) {
    selections = [{ groupId: selectedChoice.choiceGroupId, choiceId: selectedChoice.id, quantity }]
  } else {
    // No selections, or a legacy choice that never knew its group: a selection with an empty groupId would be refused by the server, so the line keeps the legacy single `selectedChoice` (the order payload sends it as `choiceId`).
    selections = []
  }
  return {
    product: product as unknown as Product,
    quantity,
    selectedChoices: selections,
    selectedChoice,
  }
}

// ---------------------------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------------------------

export interface MigratedCart {
  /** What `$patch` receives: every persisted key except `version`, with `products` in memory form. */
  state: Record<string, unknown>
  /** Lines that could not be recovered and were dropped. */
  dropped: number
  /** The shape the data was in: 0 = no version (v0 / v1), 2 = current, 3+ = written by a newer build. */
  from: number
}

/**
 * Brings whatever was persisted to the current in-memory shape:
 *  - v0 / v1 lines (a whole Product each) are repaired (legacy single choice scaled to the line
 *    quantity, duplicate lines merged: Phase 1) and slimmed to their snapshot;
 *  - `couponDiscount` (euros, before the integer-cents engine) becomes `couponDiscountCents` (Phase 2.1);
 *  - v2 lines are validated and rebuilt from their snapshot;
 *  - lines that cannot be recovered are dropped and counted (the caller tells the customer once);
 *  - data written by a NEWER build is not guessed at: its lines are dropped, the rest is kept.
 */
export function migratePersistedCart(raw: unknown, maxQuantity: number): MigratedCart {
  if (!isRecord(raw)) return { state: {}, dropped: 0, from: 0 }

  const version = typeof raw.version === 'number' ? raw.version : 0
  const lines = Array.isArray(raw.products) ? raw.products : []
  const { version: _version, products: _products, couponDiscount, ...rest } = raw

  let recovered: CartItem[] = []
  let dropped = 0
  if (version > CART_SCHEMA_VERSION) {
    dropped = lines.length
  } else {
    const legacy: CartItem[] = []
    for (const line of lines) {
      // A line has exactly one of the two shapes, whatever the version says.
      if (isRecord(line) && isRecord(line.product)) {
        const cleaned = cleanLegacyLine(line, maxQuantity)
        if (cleaned) legacy.push(cleaned)
        else dropped += 1
      } else {
        const cleaned = cleanPersistedLine(line, maxQuantity)
        if (cleaned) recovered.push(lineFromPersisted(cleaned))
        else dropped += 1
      }
    }
    // Phase 1: legacy choices stored per unit, duplicate lines. Then slim to the snapshot.
    const repaired = migratePersistedLines(legacy, maxQuantity).map((item) =>
      lineFromPersisted(toPersistedLine(item)),
    )
    recovered = migratePersistedLines([...repaired, ...recovered], maxQuantity)
  }

  // Phase 2.1: the coupon discount as integer cents.
  let { couponDiscountCents } = rest
  if (
    typeof couponDiscountCents !== 'number' ||
    !Number.isInteger(couponDiscountCents) ||
    couponDiscountCents < 0
  ) {
    couponDiscountCents =
      typeof couponDiscount === 'number' && couponDiscount > 0 ? toCents(couponDiscount) : 0
  }
  if (!rest.couponCode) couponDiscountCents = 0

  return { state: { ...rest, couponDiscountCents, products: recovered }, dropped, from: version }
}

/** What the store's deserializer does: JSON text -> migrated state (+ how many lines were lost). */
export function parsePersistedCart(json: string, maxQuantity: number): MigratedCart {
  try {
    return migratePersistedCart(JSON.parse(json), maxQuantity)
  } catch {
    // Not JSON, or a shape nobody foresaw: an empty cart rather than a failed page (the persistence plugin would swallow the error silently anyway).
    return { state: {}, dropped: 0, from: 0 }
  }
}

/** What the store's serializer writes: the current state with lines in the slim, versioned shape. */
export function serializeCartState(
  state: { products?: CartItem[] } & Record<string, unknown>,
): string {
  const { products = [], ...rest } = state
  return JSON.stringify({
    ...rest,
    version: CART_SCHEMA_VERSION,
    products: products.map(toPersistedLine),
  })
}
