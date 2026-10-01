// Stores: cart.ts

import type { CartItem, CartState, Product, ProductChoice, ProductChoiceSelection } from '@/types'
import type { OrderExtraConfig } from '#engine/types/brand'
import { brand } from '#brand/brand'
import { defineStore } from 'pinia'
import { lineTotalCents } from '#engine/utils/pricing'

export const MAX_ITEM_QUANTITY = 99

interface ItemSelectionInput {
    choice?: ProductChoice | null;
    selections?: ProductChoiceSelection[];
}

const normalizeSelections = (choice: ProductChoice | null, selections: ProductChoiceSelection[] = []): ProductChoiceSelection[] => {
    if (selections.length > 0) {
        return selections
            .filter((selection) => selection.quantity > 0)
            .map((selection) => ({
                groupId: selection.groupId,
                choiceId: selection.choiceId,
                quantity: selection.quantity,
            }))
            .sort((a, b) => a.choiceId.localeCompare(b.choiceId))
    }

    if (choice) {
        return [{ groupId: choice.choiceGroupId, choiceId: choice.id, quantity: 1 }]
    }

    return []
}

const selectionSignature = (selections: ProductChoiceSelection[]): string =>
    selections
        .map((selection) => `${selection.groupId}:${selection.choiceId}:${selection.quantity}`)
        .join('|')

const matchesCartItem = (item: CartItem, productId: string, signature: string): boolean =>
    item.product.id === productId && selectionSignature(item.selectedChoices ?? []) === signature

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
    couponDiscount: 0,
    paymentOption: 'ONLINE',
    cashPaymentAmount: null,
    address: null,
    addressExtra: null,
    // Only what the brand offers, and only what it pre-ticks.
    orderExtra: brand.orderExtras.filter((extra) => extra.preselected).map(defaultOrderExtra),
    orderNote: null,
    preferredReadyTime: null,
})

export const useCartStore = defineStore("cart", {
    state: defaultState,

    getters: {
        totalItems(state): number {
            return state.products.reduce((total, item) => total + item.quantity, 0);
        },

        // Summed in cents, divided once. Line pricing lives in #engine/utils/pricing.
        totalPrice(state): number {
            return state.products.reduce((cents, item) => cents + lineTotalCents(item), 0) / 100;
        },

    },

    actions: {
        addProduct(product: Product, quantity: number, selection: ItemSelectionInput = {}): void {
            const normalizedSelections = normalizeSelections(selection.choice ?? null, selection.selections ?? [])
            const signature = selectionSignature(normalizedSelections)
            const cartItem = this.products.find(
                (item) => matchesCartItem(item, product.id, signature)
            );
            if (cartItem) {
                cartItem.quantity = Math.min(cartItem.quantity + quantity, MAX_ITEM_QUANTITY);
            } else {
                this.products.push({
                    product,
                    quantity: Math.min(Math.max(quantity, 1), MAX_ITEM_QUANTITY),
                    selectedChoices: normalizedSelections,
                    selectedChoice: selection.choice ?? null,
                });
            }
        },
        incrementQuantity(product: Product, selection: ItemSelectionInput = {}): void {
            const normalizedSelections = normalizeSelections(selection.choice ?? null, selection.selections ?? [])
            const signature = selectionSignature(normalizedSelections)
            const cartItem = this.products.find(
                (item) => matchesCartItem(item, product.id, signature)
            );
            if (cartItem) {
                if (cartItem.quantity < MAX_ITEM_QUANTITY) {
                    cartItem.quantity += 1;
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
            const signature = selectionSignature(normalizedSelections)
            const cartItem = this.products.find(
                (item) => matchesCartItem(item, product.id, signature)
            );
            if (cartItem) {
                if (cartItem.quantity > 1) {
                    cartItem.quantity -= 1;
                } else {
                    this.products = this.products.filter(
                        (item) => !matchesCartItem(item, product.id, signature)
                    );
                }
            }
        },

        removeFromCart(product: Product, selection: ItemSelectionInput = {}): void {
            const normalizedSelections = normalizeSelections(selection.choice ?? null, selection.selections ?? [])
            const signature = selectionSignature(normalizedSelections)
            this.products = this.products.filter(
                (item) => !matchesCartItem(item, product.id, signature)
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
            };
            store.isCartVisible = false;
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
                            quantity: 1,
                        }]
                        : []
                }
            }
        },
    },
});
