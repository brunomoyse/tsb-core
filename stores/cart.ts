// stores/cart.ts

import {defineStore} from "pinia";
import type {CartItem, CartState, Product, ProductChoice} from "@/types";

function matchesCartItem(item: CartItem, productId: string, choiceId: string | null): boolean {
    return item.product.id === productId && (item.selectedChoice?.id ?? null) === choiceId;
}

export const useCartStore = defineStore("cart", {
    state: (): CartState => ({
        products: [] as CartItem[],
        isCartVisible: false,
        collectionOption: 'DELIVERY',
        paymentOption: 'ONLINE',
        address: null,
        addressExtra: null,
        orderExtra: [
            {name: "chopsticks"},
            {name: "sauces", options: ["sweet", "salty"]},
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
                        (item.selectedChoice ? Number(item.selectedChoice.priceModifier) : 0);
                    return total + unitPrice * item.quantity;
                },
                0
            );
        },

    },

    actions: {
        addProduct(product: Product, quantity: number, choice: ProductChoice | null = null): void {
            const choiceId = choice?.id ?? null;
            const cartItem = this.products.find(
                (item) => matchesCartItem(item, product.id, choiceId)
            );
            if (cartItem) {
                cartItem.quantity += quantity;
            } else {
                this.products.push({
                    product,
                    quantity,
                    selectedChoice: choice,
                });
            }
        },
        incrementQuantity(product: Product, choice: ProductChoice | null = null): void {
            const choiceId = choice?.id ?? null;
            const cartItem = this.products.find(
                (item) => matchesCartItem(item, product.id, choiceId)
            );
            if (cartItem) {
                cartItem.quantity += 1;
            } else {
                this.products.push({
                    product,
                    quantity: 1,
                    selectedChoice: choice,
                });
            }
        },

        decrementQuantity(product: Product, choice: ProductChoice | null = null): void {
            const choiceId = choice?.id ?? null;
            const cartItem = this.products.find(
                (item) => matchesCartItem(item, product.id, choiceId)
            );
            if (cartItem) {
                if (cartItem.quantity > 1) {
                    cartItem.quantity -= 1;
                } else {
                    this.products = this.products.filter(
                        (item) => !matchesCartItem(item, product.id, choiceId)
                    );
                }
            }
        },

        removeFromCart(product: Product, choice: ProductChoice | null = null): void {
            const choiceId = choice?.id ?? null;
            this.products = this.products.filter(
                (item) => !matchesCartItem(item, product.id, choiceId)
            );
        },

        resetState(): void {
            this.products = [];
            this.isCartVisible = false;
            this.collectionOption = 'DELIVERY';
            this.paymentOption = 'ONLINE';
            this.address = null;
            this.addressExtra = null;
            this.orderExtra = [
                {name: "chopsticks"},
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
    persist: true,
});
