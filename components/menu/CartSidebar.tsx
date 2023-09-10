// components/CartSidebar.tsx

'use client';

import React from 'react';

import { formatPrice } from '@/utils/utils';

import { useSelector, useDispatch } from 'react-redux';
import { selectCartItems, getTotalPrice } from '@/store/selectors/cartSelectors';
import {incrementQuantity, decrementQuantity, toggleCartVisibility} from '@/store/slices/cartSlice';

import { useMutation } from "@apollo/client";
import { CREATE_ORDER_MUTATION } from "@/graphql/mutations";

const CartSidebar: React.FC = () => {
    const dispatch = useDispatch();
    /* @ts-ignore */
    const isCartVisible = useSelector(state => state.cart.isCartVisible);
    const cartItems: CartItem[] = useSelector(selectCartItems);
    const totalPrice: number = useSelector(getTotalPrice);

    const handleIncrementQuantity = (product: Product) => {
        dispatch(incrementQuantity({ id: product.id }));
    }

    const handleDecrementQuantity = (product: Product) => {
        dispatch(decrementQuantity({ id: product.id }));
    }
    const [createOrder, { data, loading, error }] = useMutation(CREATE_ORDER_MUTATION, {

    });
    const handlePayment = async () => {
        // Prepare the variables based on cart items. For instance:
        const orderProductInput = cartItems.map(item => ({
            product_id: item.product.id,
            quantity: item.quantity,
        }));

        try {
            const res = await createOrder({
                variables: {
                    orderProductInput: orderProductInput
                }
            });

            // Handle the mutation response, e.g., redirecting to a Stripe checkout URL
            if (res?.data?.createOrder?.stripeCheckoutUrl) {
                window.location.href = res.data.createOrder.stripeCheckoutUrl;
            }
        } catch (error) {
            console.error("Failed to create order:", error);
            // Handle errors, e.g., show a notification to the user
        }
    };

    const handleToggle = () => {
        dispatch(toggleCartVisibility());
    };

    if (!isCartVisible) {
        return null;
    }

    if (cartItems.length === 0) {
        // If you want to return a placeholder message:
        // return <div>Your cart is empty.</div>;
    }

    return (
        <div className="fixed top-20 right-0 w-[300px] bg-tsb-gray shadow-2xl text-off-white p-8 z-50 rounded-3xl">
            <h2 className="text-lg font-bold mb-4">Panier</h2>
            <div className="overflow-y-auto pb-16">
                {cartItems.map(({ product, quantity }) => (
                    <div key={product.id} className="mb-4 bg-tsb-gray shadow-sm rounded-lg p-4 border border-gray-200">
                        <p className="text-lg font-medium mb-2">{product.productTranslations[0].name}</p>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <button
                                    className="px-3 py-1 text-lg rounded-lg mr-2 bg-tsb-gray text-off-white border-2 border-tsb-red hover:bg-tsb-red hover:text-white focus:outline-none"
                                    onClick={() => handleDecrementQuantity(product)}
                                >
                                    -
                                </button>
                                <span className="text-md font-semibold mx-2">{quantity}</span>
                                <button
                                    className="px-3 py-1 ml-2 rounded-lg text-lg bg-tsb-gray text-off-white border-2 border-tsb-red hover:bg-tsb-red hover:text-white focus:outline-none"
                                    onClick={() => handleIncrementQuantity(product)}
                                >
                                    +
                                </button>
                            </div>

                            <p className="text-sm text-tsb-gray-lighter">Prix: {formatPrice(product.price * quantity)}</p>
                        </div>
                    </div>
                ))}
            </div>
            <div className="my-6 text-xl font-bold">
                Total: {formatPrice(totalPrice)}
            </div>
            <button
                onClick={handlePayment}
                className="flex items-center justify-center p-4 w-full text-off-white bg-tsb-red-darker hover:bg-tsb-red rounded-full transition ease-in-out duration-150 hover:bg-coralPink-darker focus:outline-none focus:ring-2 focus:ring-coralPink focus:ring-offset-2"
            >
                PAYER
            </button>

        </div>
    );
}

export default CartSidebar;
