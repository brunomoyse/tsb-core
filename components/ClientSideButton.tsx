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
        >
            ajouter
        </div>
    );
}

export default ClientSideButton;
