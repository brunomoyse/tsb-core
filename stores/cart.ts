// stores/cart.ts

import {defineStore} from "pinia";
import type {CartItem, CartState, Product} from "@/types";

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
                (total, item) => total + item.product.price * item.quantity,
                0
            );
        },

    },

    actions: {
        addProduct(product: Product, quantity: number): void {
            const cartItem = this.products.find(
                (item) => item.product.id === product.id
            );
            if (cartItem) {
                cartItem.quantity += quantity;
            } else {
                this.products.push({
                    product,
                    quantity,
                });
            }
        },
        incrementQuantity(product: Product): void {
            const cartItem = this.products.find(
                (item) => item.product.id === product.id
            );
            if (cartItem) {
                cartItem.quantity += 1;
            } else {
                this.products.push({
                    product,
                    quantity: 1,
                });
            }
        },

        decrementQuantity(product: Product): void {
            const cartItem = this.products.find(
                (item) => item.product.id === product.id
            );
            if (cartItem) {
                if (cartItem.quantity > 1) {
                    cartItem.quantity -= 1;
                } else {
                    // Remove the product if quantity is 1
                    this.products = this.products.filter(
                        (item) => item.product.id !== product.id
                    );
                }
            } else {
                console.warn(`Product with ID ${product.id} not found in the cart.`);
            }
        },

        removeFromCart(product: Product): void {
            // Find the cart item based on the product ID
            const cartItem = this.products.find(
                (item) => item.product.id === product.id
            );

            if (cartItem) {
                this.products = this.products.filter(
                    (item) => item.product.id !== product.id
                );
            } else {
                console.warn(`Product with ID ${product.id} not found in the cart.`);
            }
        },

        clearCart(): void {
            this.products = [];
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
