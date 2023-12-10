// store/index.ts

import { configureStore } from '@reduxjs/toolkit';
import cartReducer from './slices/cartSlice';
import productsReducer from './slices/productsSlice';
import { saveToLocalStorageWithExpiry } from '@/lib/utils/localStorage';

/* @ts-ignore */
const cartLocalStorageMiddleware = store => next => action => {
    let result = next(action);

    // If the action type belongs to 'cart', save it to localStorage
    if (action.type.includes('cart/')) {
        const currentCartState = store.getState().cart;
        saveToLocalStorageWithExpiry('cart', currentCartState); // Adjust TTL as needed
    }

    return result;
};

const store = configureStore({
    reducer: {
        cart: cartReducer,
        products: productsReducer
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(cartLocalStorageMiddleware)
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;
