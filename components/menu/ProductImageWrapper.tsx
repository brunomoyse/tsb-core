"use client";
import { useDispatch } from 'react-redux';
import { setCurrentProduct, toggleProductDialog } from '@/store/slices/productsSlice';
import * as React from "react";

interface ProductCardProps {
    product: Product;
}

const ProductImageWrapper: React.FC<ProductCardProps> = ({ product}) => {
    const dispatch = useDispatch();
    const handleShowDetail = () => {
        dispatch(setCurrentProduct(product));
        dispatch(toggleProductDialog());
    };
    return (
        <div className="absolute top-0 bottom-0 left-0 right-0 cursor-pointer" onClick={handleShowDetail}></div>
    );
}

export default ProductImageWrapper;
