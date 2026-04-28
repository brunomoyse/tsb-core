// Stores: cart.ts

import type { CartItem, CartState, Product, ProductChoice, ProductChoiceSelection } from '@/types'
import { defineStore } from 'pinia'

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

const selectionModifierTotal = (product: Product, selections: ProductChoiceSelection[] = [], fallbackChoice?: ProductChoice | null): number => {
    if (selections.length > 0) {
        const choiceMap = new Map((product.choices ?? []).map((choice) => [choice.id, choice]))
        return selections.reduce((sum, selection) => {
            const choice = choiceMap.get(selection.choiceId)
            if (!choice) return sum
            return sum + Number(choice.priceModifier) * selection.quantity
        }, 0)
    }

    return fallbackChoice ? Number(fallbackChoice.priceModifier) : 0
}

export const useCartStore = defineStore("cart", {
    state: (): CartState => ({
        products: [] as CartItem[],
        isCartVisible: false,
        collectionOption: 'DELIVERY',
        couponCode: null,
        couponDiscount: 0,
        paymentOption: 'ONLINE',
        cashPaymentAmount: null,
        address: null,
        addressExtra: null,
        orderExtra: [
            {name: "chopsticks"},
            {name: "wasabi"},
            {name: "ginger"},
        ],
        orderNote: null,
        preferredReadyTime: null,
    }),

    getters: {
        totalItems(state): number {
            return state.products.reduce((total, item) => total + item.quantity, 0);
        },

        totalPrice(state): number {
            return state.products.reduce(
                (total, item) => {
                    const unitPrice = Number(item.product.price) +
                        selectionModifierTotal(item.product, item.selectedChoices ?? [], item.selectedChoice);
                    return total + unitPrice * item.quantity;
                },
                0
            );
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
            this.products = [];
            this.isCartVisible = false;
            this.collectionOption = 'DELIVERY';
            this.couponCode = null;
            this.couponDiscount = 0;
            this.paymentOption = 'ONLINE';
            this.cashPaymentAmount = null;
            this.address = null;
            this.addressExtra = null;
            this.orderExtra = [
                {name: "chopsticks"},
                {name: "wasabi"},
                {name: "ginger"},
                {name: "sauces", options: ["sweet", "salty"]},
            ];
            this.orderNote = null;
            this.preferredReadyTime = null;
        },

        toggleCartVisibility(): void {
            this.isCartVisible = !this.isCartVisible;
        },
        setCartVisibility(visible: boolean): void {
            this.isCartVisible = visible;
        }
    },
    persist: {
        afterHydrate: (ctx) => {
            const store = ctx.store as { products: CartItem[] };
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
