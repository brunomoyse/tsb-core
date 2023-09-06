'use client';

import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { clearCart } from '@/store/slices/cartSlice';

const ClearCart: React.FC = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(clearCart());
    }, [dispatch]);

    return null; // This component doesn't render anything visually
}

export default ClearCart;
