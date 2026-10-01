// Stores: cart.ts

import type { CartItem, CartState, Product, ProductChoice, ProductChoiceSelection } from '@/types'
import { lineSignature, matchesLine, mergeIntoLine, migratePersistedLines, rescaleSelections, sortSelections } from '#engine/utils/cartLines'
import { lineTotalCents, toCents } from '#engine/utils/pricing'
import type { OrderExtraConfig } from '#engine/types/brand'
import { brand } from '#brand/brand'
import { defineStore } from 'pinia'

export const MAX_ITEM_QUANTITY = 99

interface ItemSelectionInput {
    choice?: ProductChoice | null;
    selections?: ProductChoiceSelection[];
    /** Lookups of an existing line (increment/decrement/remove): the line's own quantity, to tell apart lines whose selections look alike. */
    quantity?: number;
}

const normalizeSelections = (choice: ProductChoice | null, selections: ProductChoiceSelection[] = [], choiceQuantity = 1): ProductChoiceSelection[] => {
    if (selections.length > 0) {
        return sortSelections(selections
            .filter((selection) => selection.quantity > 0)
            .map((selection) => ({
                groupId: selection.groupId,
                choiceId: selection.choiceId,
                quantity: selection.quantity,
            })))
    }

    // A lone legacy choice applies to every unit of the line.
    if (choice) {
        return [{ groupId: choice.choiceGroupId, choiceId: choice.id, quantity: choiceQuantity }]
    }

    return []
}

// Finds an existing line from its own (line-wide) selections, as the cart surfaces hand them back.
// Order-insensitive (same canonical comparator as the stored order, see cartLines.ts).
const matchesCartItem = (item: CartItem, line: { productId: string; selections: ProductChoiceSelection[]; quantity?: number }): boolean =>
    matchesLine(item, line)

// Merging identity of a NEW add: per unit, so 1 bowl + 2 bowls with the same choices become one line.
const matchesLineToMerge = (item: CartItem, productId: string, signature: string): boolean =>
    item.product.id === productId && lineSignature(item.selectedChoices ?? [], item.quantity) === signature

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
export const defaultOrderExtra = (extra: OrderExtraConfig): { name: string; options?: string[] } =>
    extra.options?.length
        ? { name: extra.name, options: [extra.defaultOption ?? extra.options[0]!] }
        : { name: extra.name }

// Single source for the initial state and resetState(), so a second order starts exactly like the first.
const defaultState = (): CartState => ({
    products: [],
    isCartVisible: false,
    collectionOption: 'DELIVERY',
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

export const useCartStore = defineStore("cart", {
    state: defaultState,

    getters: {
        totalItems(state): number {
            return state.products.reduce((total, item) => total + item.quantity, 0);
        },

        // Σ line totals in integer cents. Line pricing lives in #engine/utils/pricing.
        subtotalCents(state): number {
            return state.products.reduce((cents, item) => cents + lineTotalCents(item), 0);
        },

    },

    actions: {
        addProduct(product: Product, quantity: number, selection: ItemSelectionInput = {}): void {
            const lineQuantity = Math.min(Math.max(quantity, 1), MAX_ITEM_QUANTITY)
            const normalizedSelections = normalizeSelections(selection.choice ?? null, selection.selections ?? [], lineQuantity)
            const signature = lineSignature(normalizedSelections, lineQuantity)
            const cartItem = this.products.find(
                (item) => matchesLineToMerge(item, product.id, signature)
            );
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
            });
        },
        incrementQuantity(product: Product, selection: ItemSelectionInput = {}): void {
            const normalizedSelections = normalizeSelections(selection.choice ?? null, selection.selections ?? [])
            const cartItem = this.products.find(
                (item) => matchesCartItem(item, { productId: product.id, selections: normalizedSelections, quantity: selection.quantity })
            );
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
                });
            }
        },

        decrementQuantity(product: Product, selection: ItemSelectionInput = {}): void {
            const normalizedSelections = normalizeSelections(selection.choice ?? null, selection.selections ?? [])
            const cartItem = this.products.find(
                (item) => matchesCartItem(item, { productId: product.id, selections: normalizedSelections, quantity: selection.quantity })
            );
            if (cartItem) {
                if (cartItem.quantity > 1) {
                    setLineQuantity(cartItem, cartItem.quantity - 1)
                } else {
                    this.products = this.products.filter(
                        (item) => item !== cartItem
                    );
                }
            }
        },

        removeFromCart(product: Product, selection: ItemSelectionInput = {}): void {
            const normalizedSelections = normalizeSelections(selection.choice ?? null, selection.selections ?? [])
            this.products = this.products.filter(
                (item) => !matchesCartItem(item, { productId: product.id, selections: normalizedSelections, quantity: selection.quantity })
            );
        },

        resetState(): void {
            this.$patch(defaultState());
        },

        toggleCartVisibility(): void {
            this.isCartVisible = !this.isCartVisible;
        },
        setCartVisibility(visible: boolean): void {
            this.isCartVisible = visible;
        }
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
         * `isCartVisible` is transient UI state. Persisting it caused users to
         * land on /menu with an empty drawer but `isCartVisible: true` still in
         * localStorage, hiding the FloatingCartBar (its v-if depends on
         * `!isCartVisible`) and leaving no visible way to open the cart.
         */
        omit: ['isCartVisible'],
        afterHydrate: (ctx) => {
            const store = ctx.store as {
                products: CartItem[];
                isCartVisible: boolean;
                orderExtra: CartState['orderExtra'];
                couponDiscountCents: number;
            };
            store.isCartVisible = false;
            /*
             * Carts persisted before the engine went integer-cents stored the coupon discount as a
             * euro number (`couponDiscount: 3.5`). Convert it once and drop the old key. The key lives
             * in `$state` (what gets persisted), so delete it there or it would come back.
             */
            const persisted = ctx.store.$state as unknown as { couponDiscount?: unknown };
            if (typeof persisted.couponDiscount === 'number' && persisted.couponDiscount > 0) {
                store.couponDiscountCents = toCents(persisted.couponDiscount)
            }
            delete persisted.couponDiscount
            if (!Number.isInteger(store.couponDiscountCents) || store.couponDiscountCents < 0) store.couponDiscountCents = 0
            // Drop extras this brand doesn't offer (old carts, or entries removed from the UI).
            if (Array.isArray(store.orderExtra)) {
                const offered = new Set(brand.orderExtras.map((extra) => extra.name))
                store.orderExtra = store.orderExtra.filter((extra) => offered.has(extra.name))
            }
            for (const item of store.products) {
                if (item.quantity > MAX_ITEM_QUANTITY) item.quantity = MAX_ITEM_QUANTITY;
                if (item.quantity < 1) item.quantity = 1;
                if (!Array.isArray(item.selectedChoices)) {
                    item.selectedChoices = item.selectedChoice
                        ? [{
                            groupId: item.selectedChoice.choiceGroupId,
                            choiceId: item.selectedChoice.id,
                            quantity: item.quantity,
                        }]
                        : []
                }
            }
            // Carts persisted by older builds: legacy choices stored per unit, duplicate lines.
            store.products = migratePersistedLines(store.products, MAX_ITEM_QUANTITY)
        },
    },
});
