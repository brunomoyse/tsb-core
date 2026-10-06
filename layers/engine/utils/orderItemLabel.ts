export interface OrderItemLabelInput {
  code?: string | null
  categoryName?: string | null
  productName: string
  choiceName?: string | null
}

export interface OrderItemLabelParts {
  code?: string
  category?: string
  name: string
  choice?: string
}

/** Trimmed text, undefined when absent or blank. */
const trimmed = (value: string | null | undefined): string | undefined => {
  const text = value?.trim()
  return text === undefined || text === '' ? undefined : text
}

/**
 * Canonical order/cart item label parts — `code · category · name` plus
 * optional `choice`.
 */
export function orderItemLabelParts(input: OrderItemLabelInput): OrderItemLabelParts {
  const code = trimmed(input.code)
  const rawCategory = trimmed(input.categoryName)
  return {
    code,
    category: rawCategory,
    name: input.productName,
    choice: trimmed(input.choiceName),
  }
}

export interface OrderItemChoiceInput {
  choice?: { name: string } | null
  selections?: { choiceId: string; quantity: number }[] | null
  product?: { choices?: { id: string; name: string }[] | null }
}

/**
 * The choices of an order line as shown to the customer: "Tonkotsu, Corn x2" (selection quantities are
 * line-wide, like in the cart). The names come from the product's choices because the API's
 * `OrderItemSelection.choice` is not queried (see types/index.ts). Orders from before selections
 * existed fall back to their single `choice`.
 */
export function orderItemChoiceText(item: OrderItemChoiceInput): string | undefined {
  const selections = item.selections ?? []
  if (selections.length > 0) {
    const names = new Map((item.product?.choices ?? []).map((choice) => [choice.id, choice.name]))
    const text = selections
      .map((selection) => {
        const name = names.get(selection.choiceId)
        if (name === undefined || name === '') return ''
        return selection.quantity > 1 ? `${name} x${selection.quantity}` : name
      })
      .filter(Boolean)
      .join(', ')
    if (text !== '') return text
  }
  return trimmed(item.choice?.name)
}

export interface CartLineLabelInput {
  product: {
    code?: string | null
    name: string
    category?: { name: string } | null
    choices?: { id: string; name: string }[] | null
    pieceCount?: number | null
  }
  selectedChoice?: { name: string } | null
  selectedChoices?: { choiceId: string; quantity: number }[] | null
}

export interface CartLineMetaOptions {
  /** `brand.showProductCode`: the menu code ("E1") goes before the category. */
  showProductCode: boolean
  /**
   * The piece count suffix ("6 pcs") that closes the line on the cart page; absent elsewhere.
   * With it the parts are joined with " · ", without it with "·" (the compact single lines of the order lists).
   */
  pieces?: { one: string; many: string }
  /** Join with " · " even without the piece count: the cart surfaces wrap this line, and an unspaced "A1·Category" can only break inside a word. */
  spaced?: boolean
}

/** The small line above a cart item's name: `code · category · pieces`, whatever the brand and the surface show. */
export function cartLineMeta(
  item: CartLineLabelInput,
  options: CartLineMetaOptions,
): string | undefined {
  const parts = orderItemLabelParts({
    code: item.product.code,
    categoryName: item.product.category?.name,
    productName: item.product.name,
  })
  const bits: string[] = []
  if (options.showProductCode && parts.code !== undefined) bits.push(parts.code)
  if (parts.category !== undefined) bits.push(parts.category)
  const { pieceCount } = item.product
  if (options.pieces && pieceCount !== undefined && pieceCount !== null && pieceCount !== 0) {
    bits.push(`${pieceCount} ${pieceCount === 1 ? options.pieces.one : options.pieces.many}`)
  }
  return bits.length > 0
    ? bits.join(options.pieces || options.spaced === true ? ' · ' : '·')
    : undefined
}

/** The choices of a cart line, like the order lines show them ("Tonkotsu, Corn x2"). */
export function cartLineChoiceText(item: CartLineLabelInput): string | undefined {
  return orderItemChoiceText({
    choice: item.selectedChoice,
    selections: item.selectedChoices,
    product: item.product,
  })
}

export interface OrderLineLabelInput extends OrderItemChoiceInput {
  product: {
    code?: string | null
    name: string
    category?: { name: string } | null
    choices?: { id: string; name: string }[] | null
  }
}

export interface OrderLineSegment {
  text: string
  /** Code and category are shown muted, the name is the line's main text. */
  muted: boolean
}

/** The name line of an order line, in pieces: `code` (brand permitting), `category`, then the product name. */
export function orderLineSegments(
  item: OrderLineLabelInput,
  showProductCode: boolean,
): OrderLineSegment[] {
  const parts = orderItemLabelParts({
    code: item.product.code,
    categoryName: item.product.category?.name,
    productName: item.product.name,
  })
  const segments: OrderLineSegment[] = []
  if (showProductCode && parts.code !== undefined) segments.push({ text: parts.code, muted: true })
  if (parts.category !== undefined) segments.push({ text: parts.category, muted: true })
  segments.push({ text: parts.name, muted: false })
  return segments
}
