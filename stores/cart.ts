// stores/cart.ts

import { defineStore } from "pinia";
import type { CartState, CartItem, ProductInfo } from "@/types";

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
     * Adds a product to the cart.
     * If the product already exists, increments its quantity.
     * Otherwise, adds the product with a quantity of 1.
     * @param product - The product to add to the cart.
     */
    addToCart(product: ProductInfo): void {
      console.log("Adding to cart", product.id);
      const existingCartItem = this.products.find(
        (item) => item.product.id === product.id
      );
      if (existingCartItem) {
        existingCartItem.quantity += 1;
      } else {
        this.products.push({
          id: product.id,
          product: { ...product },
          quantity: 1,
        });
      }
    },

    /**
     * Removes a product from the cart based on its ID.
     * @param productId - The ID of the product to remove.
     */
    removeFromCart(productId: string, quantity: number = 0): void {
      // Find the cart item based on the product ID
      const cartItem = this.products.find(
        (item) => item.product.id === productId
      );

      if (cartItem) {
        if (cartItem.quantity > 1 && quantity > 0) {
          // Decrement the quantity by one
          cartItem.quantity -= quantity;
          console.log(
            `Decremented quantity of ${cartItem.product.name} to ${cartItem.quantity}.`
          );
        } else {
          // Quantity is 1, remove the product from the cart
          this.products = this.products.filter(
            (item) => item.product.id !== productId
          );
          console.log(
            `Removed ${cartItem.product.name} from the cart. Quantity was ${cartItem.quantity}.`
          );
        }
      } else {
        console.warn(`Product with ID ${productId} not found in the cart.`);
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
});
