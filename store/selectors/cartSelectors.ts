// store/selectors/cartSelectors.ts
import { createSelector } from 'reselect';
import { RootState } from "@/store";

// A simple selector to get cart products from state
export const getCartProducts = (state: RootState) => state.cart.products;

export const getTotalPrice = createSelector(
    [getCartProducts],
    (products: CartItem[]) => {
        return products.reduce(
            (total, { product, quantity }) => total + product.price * quantity,
            0
        );
    }
);

// A memoized selector to return cart items
export const selectCartItems = createSelector(
    [getCartProducts],
    (products: CartItem[]) => products
);

// A memoized selector to return the total quantity of products
export const selectTotalProductQuantity = createSelector(
    [getCartProducts],
    (products: CartItem[]) => products.reduce((acc, product) => acc + product.quantity, 0)
);
