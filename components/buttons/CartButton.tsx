//  components/CartSidebar.tsx

"use client";

import { useDispatch, useSelector } from 'react-redux';
import { selectTotalProductQuantity } from '@/store/selectors/cartSelectors';
import React from "react";
import { toggleCartVisibility } from "@/store/slices/cartSlice";

const CartButton: React.FC = () => {
    const totalProductQuantity = useSelector(selectTotalProductQuantity);

    const isCartEmpty = totalProductQuantity === 0;

    const dispatch = useDispatch();

    const handleToggle = () => {
        dispatch(toggleCartVisibility());
    };

    return (
        <button
            onClick={handleToggle}
            className={`relative flex items-center justify-center rounded-full h-9 w-28 font-semibold text-sm 
                        ${isCartEmpty ? 'bg-tsb-gray text-off-white border-2 border-tsb-red hover:bg-tsb-red hover:text-white' : 'bg-tsb-red-darker hover:bg-tsb-red'}`}
        >
            {!isCartEmpty && (
                <span className="absolute bottom-0 right-0 transform translate-x-[50%] translate-y-[50%] bg-tsb-red text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                    {totalProductQuantity}
                </span>
            )}
            <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" className="mr-2 h-5 w-5 fill-current">
                <path fillRule="evenodd" clipRule="evenodd" d="M3.666 11.333h10.333l1.334-8h-11l-.267-2h-3.4v2h1.667l1.333 8zm1.333 3.334A1.333 1.333 0 105 12a1.333 1.333 0 000 2.667zm9.334-1.334a1.333 1.333 0 11-2.667 0 1.333 1.333 0 012.667 0z"></path>
            </svg>
            <span>Panier</span>
        </button>
    );
}

export default CartButton;
