// store/slices/cartSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getFromLocalStorageWithExpiry } from '@/utils/localStorage';

const initialState: CartState = {
    products: getFromLocalStorageWithExpiry('cart')?.products || [],
    isCartVisible: false,
};

const cartSlice = createSlice({
    name: 'cart',
    initialState,
    reducers: {
        toggleCartVisibility: state => {
            state.isCartVisible = !state.isCartVisible;
        },
        addToCart: (state, action: PayloadAction<Product>) => {
            const productToAdd = action.payload;
            const existingCartItemIndex = state.products.findIndex(item => item.product.id === productToAdd.id);

            if (existingCartItemIndex !== -1) {
                // Using the spread operator to return a new array instance
                return {
                    ...state,
                    products: state.products.map((item, index) => {
                        if (index === existingCartItemIndex) {
                            return {
                                ...item,
                                quantity: item.quantity + 1
                            };
                        }
                        return item;
                    })
                };
            } else {
                // Using the spread operator to return a new array instance
                return {
                    ...state,
                    products: [...state.products, {
                        id: productToAdd.id,
                        product: productToAdd,
                        quantity: 1
                    }]
                };
            }
        },
        incrementQuantity: (state, action: PayloadAction<{ id: string }>) => {
            const productId = action.payload.id;
            const cartItemIndex = state.products.findIndex(item => item.id === productId);

            if (cartItemIndex !== -1) {
                state.products[cartItemIndex].quantity += 1;
            }
        },
        decrementQuantity: (state, action: PayloadAction<{ id: string }>) => {
            const productId = action.payload.id;
            const cartItemIndex = state.products.findIndex(item => item.id === productId);

            if (cartItemIndex !== -1 && state.products[cartItemIndex].quantity > 1) {
                state.products[cartItemIndex].quantity -= 1;
            } else if (cartItemIndex !== -1 && state.products[cartItemIndex].quantity === 1) {
                state.products.splice(cartItemIndex, 1);
            }
        },
        clearCart: state => {
            state.products = [];
        }
    }
});

export const {
    toggleCartVisibility,
    addToCart,
    incrementQuantity,
    decrementQuantity,
    clearCart
} = cartSlice.actions;
export default cartSlice.reducer;
