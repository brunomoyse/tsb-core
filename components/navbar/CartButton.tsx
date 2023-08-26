"use client";
import { useSelector } from 'react-redux';
import { selectTotalProductQuantity } from '@/store/selectors/cartSelectors';
import React from "react";

const CartButton: React.FC = () => {
    const totalProductQuantity = useSelector(selectTotalProductQuantity);

    const isCartEmpty = totalProductQuantity === 0;

    return (
        <button
            className={`flex items-center justify-center rounded-full h-9 w-20 text-offWhite font-semibold text-sm 
                        ${isCartEmpty ? 'bg-softPink hover:bg-coralPink' : 'bg-coralPink hover:bg-coralPink-darker'}`}
        >
            <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" className="mr-2 h-5 w-5 fill-current">
                <path fillRule="evenodd" clipRule="evenodd" d="M3.666 11.333h10.333l1.334-8h-11l-.267-2h-3.4v2h1.667l1.333 8zm1.333 3.334A1.333 1.333 0 105 12a1.333 1.333 0 000 2.667zm9.334-1.334a1.333 1.333 0 11-2.667 0 1.333 1.333 0 012.667 0z"></path>
            </svg>
            <div>{isCartEmpty ? '' : `• ${totalProductQuantity}`}</div>
        </button>
    );
}

export default CartButton;
