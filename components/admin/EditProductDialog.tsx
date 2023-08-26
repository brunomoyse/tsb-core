"use client";

import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from '@mui/material';
import {useEffect, useState} from "react";

// @ts-ignore
const EditProductDialog = ({ product, onSave, onClose }) => {
    const [currentProduct, setCurrentProduct] = useState(product);

    useEffect(() => {
        setCurrentProduct(product);
    }, [product]);

    const handleSave = () => {
        onSave(currentProduct);
    }

    return (
        <Dialog open={!!product} onClose={onClose}>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Code"
                    value={currentProduct?.code || ''}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, code: e.target.value })}
                    fullWidth
                />
                <TextField
                    margin="dense"
                    label="Name"
                    value={currentProduct?.name || ''}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                    fullWidth
                />
                <TextField
                    margin="dense"
                    label="Price"
                    value={currentProduct?.price || ''}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, price: parseFloat(e.target.value) })}
                    fullWidth
                />
                <TextField
                    margin="dense"
                    label="Tag"
                    value={currentProduct?.tag || ''}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, tag: e.target.value })}
                    fullWidth
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="primary">
                    Cancel
                </Button>
                <Button onClick={handleSave} color="primary">
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default EditProductDialog;
