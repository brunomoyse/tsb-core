// ClientSideButton.tsx

'use client';

import React from 'react';
import { useDispatch } from 'react-redux';
import { addToCart } from '@/store/slices/cartSlice';

interface ClientSideButtonProps {
    product: Product;
}

const ClientSideButton: React.FC<ClientSideButtonProps> = ({ product }) => {
    const dispatch = useDispatch();

    return (
        <div
            onClick={() => dispatch(addToCart(product))}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center opacity-0 group-hover:opacity-100 text-2xl text-white bg-pink-500 rounded-full cursor-pointer z-10"
        >
            +
        </div>
    );
}

export default ClientSideButton;
