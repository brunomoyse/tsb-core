// stores/cart.ts

import {defineStore} from "pinia";
import type {CartItem, CartState, Product} from "@/types";

/**
 * Pinia store for managing the shopping cart.
 */
export const useCartStore = defineStore("cart", {
    /**
     * The state of the cart, including the list of products and cart visibility.
     */
    state: (): CartState => ({
        products: [] as CartItem[],
        isCartVisible: false,
        // Removed totalPrice from state
    }),

    /**
     * Getters for computing derived state.
     */
    getters: {
        /**
         * Computes the total number of items in the cart.
         * @param state - The current state of the cart.
         * @returns The total number of items.
         */
        totalItems(state): number {
            return state.products.reduce((total, item) => total + item.quantity, 0);
        },

        /**
         * Computes the total price of items in the cart.
         * @param state - The current state of the cart.
         * @returns The total price.
         */
        totalPrice(state): number {
            return state.products.reduce(
                (total, item) => total + item.product.price * item.quantity,
                0
            );
        },
    },

    /**
     * Actions for modifying the cart state.
     */
    actions: {
        /**
         * Increments the quantity of a product in the cart.
         * @param productId - The ID of the product to increment.
         */
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

        /**
         * Decrements the quantity of a product in the cart.
         * If the quantity reaches 0, the product is removed from the cart.
         * @param productId - The ID of the product to decrement.
         */
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

        /**
         * Removes a product from the cart based on its ID.
         * @param product - The product to remove.
         */
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

        /**
         * Clears all items from the cart.
         */
        clearCart(): void {
            this.products = [];
        },

        /**
         * Toggles the visibility of the cart.
         */
        toggleCartVisibility(): void {
            this.isCartVisible = !this.isCartVisible;
        },
    },
    persist: true,
});
