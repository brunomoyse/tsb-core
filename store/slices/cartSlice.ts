import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getFromLocalStorageWithExpiry } from '@/utils/localStorage';

const initialState: CartState = {
    products: getFromLocalStorageWithExpiry('cart')?.products || [],
};

const cartSlice = createSlice({
    name: 'cart',
    initialState,
    reducers: {
        addToCart: (state, action: PayloadAction<Product>) => {
            const productToAdd = action.payload;
            const existingCartItemIndex = state.products.findIndex(item => item.product.id === productToAdd.id);

            if (existingCartItemIndex !== -1) {
                // Increment the quantity if the product already exists in the cart
                state.products[existingCartItemIndex].quantity += 1;
            } else {
                // Add a new product entry if it doesn't exist
                state.products.push({
                    id: productToAdd.id,
                    product: productToAdd,
                    quantity: 1
                });
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
    addToCart,
    incrementQuantity,
    decrementQuantity,
    clearCart
} = cartSlice.actions;
export default cartSlice.reducer;
