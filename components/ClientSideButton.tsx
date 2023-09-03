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
            className="text-tsb-gray-lighter hover:text-tsb-red-lighter cursor-pointer flex justify-center mb-2 underline underline-offset-8 decoration-tsb-red"
        >
            <span>ajouter</span>
        </div>
    );
}

export default ClientSideButton;
