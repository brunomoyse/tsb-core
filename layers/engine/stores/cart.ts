// Stores: cart.ts

import type {
  CartItem,
  CartState,
  Product,
  ProductChoice,
  ProductChoiceSelection,
} from '#engine/types'
import { brandOffersDelivery, defaultCollectionOption } from '#engine/utils/deliveryMode'
import {
  lineSignature,
  matchesLine,
  mergeIntoLine,
  rescaleSelections,
  sortSelections,
} from '#engine/utils/cartLines'
import { parsePersistedCart, serializeCartState } from '#engine/utils/cartPersistence'
import type { OrderExtraConfig } from '#engine/types/brand'
import type { QuoteLine } from '#engine/utils/orderQuote'
import { brand } from '#brand/brand'
import { defineStore } from 'pinia'
import { lineTotalCents } from '#engine/utils/pricing'
import { quotedSnapshotPricing } from '#engine/utils/cartIssues'

export const MAX_ITEM_QUANTITY = 99

// What the last deserialization dropped; handed to the store by afterHydrate (the serializer cannot reach the store).
let pendingDropped = 0

// The store as afterHydrate sees it (the plugin's context types it as the whole store, which is circular here).
interface HydratedCartStore {
  isCartVisible: boolean
  droppedOnHydrate: number
  orderExtra: CartState['orderExtra']
  $persist?: () => void
}

interface ItemSelectionInput {
  choice?: ProductChoice | null
  selections?: ProductChoiceSelection[]
  /** Lookups of an existing line (increment/decrement/remove): the line's own quantity, to tell apart lines whose selections look alike. */
  quantity?: number
}

const normalizeSelections = (
  choice: ProductChoice | null,
  selections: ProductChoiceSelection[] = [],
  choiceQuantity = 1,
): ProductChoiceSelection[] => {
  if (selections.length > 0) {
    return sortSelections(
      selections
        .filter((selection) => selection.quantity > 0)
        .map((selection) => ({
          groupId: selection.groupId,
          choiceId: selection.choiceId,
          quantity: selection.quantity,
        })),
    )
  }

  // A lone legacy choice applies to every unit of the line. Without its group (a query that
  // Did not select it) it stays a plain choiceId on the order line.
  if (
    choice?.choiceGroupId !== undefined &&
    choice.choiceGroupId !== null &&
    choice.choiceGroupId !== ''
  ) {
    return [{ groupId: choice.choiceGroupId, choiceId: choice.id, quantity: choiceQuantity }]
  }

  return []
}

// Finds an existing line from its own (line-wide) selections, as the cart surfaces hand them back.
// Order-insensitive (same canonical comparator as the stored order, see cartLines.ts).
const matchesCartItem = (
  item: CartItem,
  line: { productId: string; selections: ProductChoiceSelection[]; quantity?: number },
): boolean => matchesLine(item, line)

// Merging identity of a NEW add: per unit, so 1 bowl + 2 bowls with the same choices become one line.
const matchesLineToMerge = (item: CartItem, productId: string, signature: string): boolean =>
  item.product.id === productId &&
  lineSignature(item.selectedChoices ?? [], item.quantity) === signature

/**
 * Changes a line's quantity and rescales its selections with it (group min/max scale with the
 * quantity, so 2 bowls need 2 broths). Returns false and leaves the line untouched when its
 * composition is not uniform per unit: that line can only be edited from the menu.
 */
const setLineQuantity = (item: CartItem, quantity: number): boolean => {
  const selections = item.selectedChoices ?? []
  const rescaled = rescaleSelections(selections, item.quantity, quantity)
  if (!rescaled) return false
  item.selectedChoices = rescaled
  item.quantity = quantity
  return true
}

/** The `orderExtra` entry for an extra in its pre-selected form (e.g. soy sauce -> `both`). */
export const defaultOrderExtra = (
  extra: OrderExtraConfig,
): { name: string; options?: string[] } => {
  const [firstOption] = extra.options ?? []
  return firstOption === undefined
    ? { name: extra.name }
    : { name: extra.name, options: [extra.defaultOption ?? firstOption] }
}

// Single source for the initial state and resetState(), so a second order starts exactly like the first.
const defaultState = (): CartState => ({
  products: [],
  isCartVisible: false,
  droppedOnHydrate: 0,
  // A takeaway-only brand starts on PICKUP (useDeliveryMode has the rule, plugins/delivery-mode.ts enforces it).
  collectionOption: defaultCollectionOption(brandOffersDelivery(brand.deliveryEnabled)),
  couponCode: null,
  couponDiscountCents: 0,
  paymentOption: 'ONLINE',
  cashPaymentAmount: null,
  address: null,
  addressExtra: null,
  // Only what the brand offers, and only what it pre-ticks.
  orderExtra: brand.orderExtras.filter((extra) => extra.preselected).map(defaultOrderExtra),
  orderNote: null,
  preferredReadyTime: null,
  pendingOrderId: null,
})

export const useCartStore = defineStore('cart', {
  state: defaultState,

  getters: {
    totalItems(state): number {
      return state.products.reduce((total, item) => total + item.quantity, 0)
    },

    // Σ line totals in integer cents. Line pricing lives in #engine/utils/pricing.
    subtotalCents(state): number {
      return state.products.reduce((cents, item) => cents + lineTotalCents(item), 0)
    },
  },

  actions: {
    addProduct(product: Product, quantity: number, selection: ItemSelectionInput = {}): void {
      const lineQuantity = Math.min(Math.max(quantity, 1), MAX_ITEM_QUANTITY)
      const normalizedSelections = normalizeSelections(
        selection.choice ?? null,
        selection.selections ?? [],
        lineQuantity,
      )
      const signature = lineSignature(normalizedSelections, lineQuantity)
      const cartItem = this.products.find((item) => matchesLineToMerge(item, product.id, signature))
      if (cartItem) {
        const merged = mergeIntoLine(
          { quantity: cartItem.quantity, selections: cartItem.selectedChoices ?? [] },
          { quantity: lineQuantity, selections: normalizedSelections },
          MAX_ITEM_QUANTITY,
        )
        if (merged) {
          cartItem.quantity = merged.quantity
          cartItem.selectedChoices = merged.selections
          return
        }
      }
      this.products.push({
        product,
        quantity: lineQuantity,
        selectedChoices: normalizedSelections,
        selectedChoice: selection.choice ?? null,
      })
    },
    incrementQuantity(product: Product, selection: ItemSelectionInput = {}): void {
      const normalizedSelections = normalizeSelections(
        selection.choice ?? null,
        selection.selections ?? [],
      )
      const cartItem = this.products.find((item) =>
        matchesCartItem(item, {
          productId: product.id,
          selections: normalizedSelections,
          quantity: selection.quantity,
        }),
      )
      if (cartItem) {
        if (cartItem.quantity < MAX_ITEM_QUANTITY) {
          setLineQuantity(cartItem, cartItem.quantity + 1)
        }
      } else {
        this.products.push({
          product,
          quantity: 1,
          selectedChoices: normalizedSelections,
          selectedChoice: selection.choice ?? null,
        })
      }
    },

    decrementQuantity(product: Product, selection: ItemSelectionInput = {}): void {
      const normalizedSelections = normalizeSelections(
        selection.choice ?? null,
        selection.selections ?? [],
      )
      const cartItem = this.products.find((item) =>
        matchesCartItem(item, {
          productId: product.id,
          selections: normalizedSelections,
          quantity: selection.quantity,
        }),
      )
      if (cartItem) {
        if (cartItem.quantity > 1) {
          setLineQuantity(cartItem, cartItem.quantity - 1)
        } else {
          this.products = this.products.filter((item) => item !== cartItem)
        }
      }
    },

    removeFromCart(product: Product, selection: ItemSelectionInput = {}): void {
      const normalizedSelections = normalizeSelections(
        selection.choice ?? null,
        selection.selections ?? [],
      )
      this.products = this.products.filter(
        (item) =>
          !matchesCartItem(item, {
            productId: product.id,
            selections: normalizedSelections,
            quantity: selection.quantity,
          }),
      )
    },

    /**
     * Edit of a cart line from the menu: the line `edited` becomes the product/selections/quantity just composed,
     * IN PLACE (it keeps its position in the cart instead of moving to the bottom). Like `addProduct` the new line
     * merges into another line that is identical, and then the edited one just disappears. When the edited line is
     * not in the cart any more (emptied meanwhile, order placed), this is a plain `addProduct`.
     */
    // oxlint-disable-next-line max-params -- public store action called from three components and its tests
    replaceLine(
      edited: CartItem,
      product: Product,
      quantity: number,
      selection: ItemSelectionInput = {},
    ): void {
      const index = this.products.findIndex((item) =>
        matchesCartItem(item, {
          productId: edited.product.id,
          selections: normalizeSelections(edited.selectedChoice, edited.selectedChoices),
          quantity: edited.quantity,
        }),
      )
      if (index < 0) {
        this.addProduct(product, quantity, selection)
        return
      }
      this.products.splice(index, 1)
      const before = this.products.length
      this.addProduct(product, quantity, selection)
      // No identical line to merge into: addProduct pushed the new line last, move it to where the edited one was.
      if (this.products.length > before) this.products.splice(index, 0, this.products.pop()!)
    },

    /**
     * The customer accepts the new price of a line (PRICE_CHANGED): the stored snapshot takes the
     * product's current price and the current modifiers of its choices. The line gets a new
     * `product` object, so the menu's own product is not touched.
     */
    acceptQuotedPrice(item: CartItem, quoteLine: QuoteLine): void {
      const pricing = quotedSnapshotPricing(item.product, quoteLine)
      if (!pricing) return
      const snapshot = new Map(
        item.product.choices.map((choice: ProductChoice) => [choice.id, choice]),
      )
      // Every choice of the snapshot, repriced, then the ones the quote priced that it lacked (no name: the cart labels skip them).
      const choices = pricing.choices.map((priced): ProductChoice => {
        const existing = snapshot.get(priced.id)
        if (existing) return { ...existing, priceModifier: priced.priceModifier }
        return {
          id: priced.id,
          productId: item.product.id,
          choiceGroupId: priced.groupId ?? '',
          priceModifier: priced.priceModifier,
          sortOrder: 0,
          name: '',
        }
      })
      item.product = { ...item.product, price: pricing.price, choices }
      if (item.selectedChoice) {
        item.selectedChoice =
          item.product.choices.find(
            (choice: ProductChoice) => choice.id === item.selectedChoice?.id,
          ) ?? item.selectedChoice
      }
    },

    resetState(): void {
      this.$patch(defaultState())
    },

    toggleCartVisibility(): void {
      this.isCartVisible = !this.isCartVisible
    },
    setCartVisibility(visible: boolean): void {
      this.isCartVisible = visible
    },
  },
  persist: {
    /*
     * Explicit localStorage. `pinia-plugin-persistedstate/nuxt` defaults to
     * cookies (per-cookie ~4 KB limit), and a cart of ~10 items — each
     * carrying a full Product (description, choices, nested category) —
     * easily exceeds that. Oversized cookies get silently truncated/dropped,
     * so on the next full page reload (e.g. the OIDC redirect that lands on
     * /auth/callback) SSR receives a partial cart from the request cookie
     * header, hydration adopts the partial state, and the post-hydration
     * write persists it back — wiping items the user had added pre-login.
     * SSR is a no-op (returns null); the client-side $hydrate fires after
     * mount and rehydrates from localStorage.
     */
    storage: {
      getItem: (key) => (import.meta.client ? window.localStorage.getItem(key) : null),
      setItem: (key, value) => {
        if (import.meta.client) window.localStorage.setItem(key, value)
      },
    },
    /*
     * Versioned and slim (audit PR 2.4, see utils/cartPersistence.ts): a line is stored as
     * { productId, quantity, selections } plus the smallest snapshot that renders it before the API
     * answers; the server quote re-prices it. Older shapes (the whole Product per line, the euro
     * `couponDiscount`) are migrated here, and lines that cannot be recovered are dropped and counted
     * for the one-time notice (`droppedOnHydrate`, afterHydrate).
     */
    serializer: {
      serialize: (state) => serializeCartState(state as Parameters<typeof serializeCartState>[0]),
      deserialize: (value) => {
        const { state, dropped } = parsePersistedCart(value, MAX_ITEM_QUANTITY)
        pendingDropped = dropped
        return state
      },
    },
    /*
     * `isCartVisible` is transient UI state. Persisting it caused users to
     * land on /menu with an empty drawer but `isCartVisible: true` still in
     * localStorage, hiding the FloatingCartBar (its v-if depends on
     * `!isCartVisible`) and leaving no visible way to open the cart.
     * `droppedOnHydrate` is the hydration report, also transient.
     */
    omit: ['isCartVisible', 'droppedOnHydrate'],
    afterHydrate: (ctx) => {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the plugin types the store as the whole cart store, which is circular here
      const store = ctx.store as unknown as HydratedCartStore
      store.isCartVisible = false
      // Drop extras this brand doesn't offer (old carts, or entries removed from the UI).
      if (Array.isArray(store.orderExtra)) {
        const offered = new Set(brand.orderExtras.map((extra) => extra.name))
        store.orderExtra = store.orderExtra.filter((extra) => offered.has(extra.name))
      }
      // The migration report of the deserializer: shown once by the cart-notices plugin.
      store.droppedOnHydrate = pendingDropped
      pendingDropped = 0
      // Write the migrated shape back now: the plugin only persists on the next change, so an old cart would otherwise be migrated (and its lost lines announced) again on every visit.
      store.$persist?.()
    },
  },
})
