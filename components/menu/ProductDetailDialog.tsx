/* ProductDetailDialog.tsx */
"use client";

import React from "react";
import { useSelector, useDispatch } from 'react-redux';
import { toggleProductDialog, setCurrentProduct } from '@/store/slices/productsSlice';
import { addToCart } from '@/store/slices/cartSlice';

import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

const ProductDetailDialog: React.FC = () => {
    const dispatch = useDispatch();
    // @ts-ignore
    const currentProduct: Product = useSelector((state) => state.products.currentProduct);
    // @ts-ignore
    const isProductDialogOpen = useSelector((state) => state.products.isProductDialogOpen);

    const toggleDialog = () => {
        dispatch(toggleProductDialog());
    };

    const handleAddToCart = () => {
        dispatch(addToCart(currentProduct));
        dispatch(toggleProductDialog());
        dispatch(setCurrentProduct(null));
    }

    return (
        <>
            {currentProduct && (
                <Dialog
                    open={isProductDialogOpen}
                    onClose={toggleDialog}
                >
                    <DialogTitle>{currentProduct.productTranslations[0].name}</DialogTitle>
                    <DialogContent>
                        <DialogContentText id="alert-dialog-slide-description">
                            {currentProduct.productTranslations[0].description}
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <button onClick={toggleDialog}>Fermer</button>
                        <button onClick={handleAddToCart}>Ajouter</button>
                    </DialogActions>
                </Dialog>
            )}
        </>
    );
}

export default ProductDetailDialog;
