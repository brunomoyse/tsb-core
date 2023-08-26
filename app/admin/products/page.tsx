"use client";

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { editProduct, fetchProducts } from '@/store/slices/productsSlice';
import {
    Button,
    Container,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton
} from '@mui/material';
import EditIcon from "@mui/icons-material/Edit";
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import EditProductDialog from "@/components/admin/EditProductDialog";

const ProductsAdmin = () => {
    const dispatch = useDispatch();
    const products = useSelector((state: RootState) => state.products.products);

    React.useEffect(() => {
        dispatch(fetchProducts());
    }, [dispatch]);

    const [selectedProduct, setSelectedProduct] = React.useState(null);
    const [sortConfig, setSortConfig] = React.useState({ key: 'code', direction: 'asc' });

    const sortedProducts = [...products].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    const handleEdit = (product) => {
        setSelectedProduct(product);
    }

    const handleSave = (editedProduct) => {
        dispatch(editProduct(editedProduct));
        setSelectedProduct(null);
    }

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    return (
        <Container>
            <Button variant="contained" color="primary">Add New Product</Button>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleSort('code')}
                            >
                                Code
                                {sortConfig.key === 'code' && (sortConfig.direction === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />)}
                            </TableCell>
                            <TableCell
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleSort('name')}
                            >
                                Name
                                {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />)}
                            </TableCell>
                            <TableCell
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleSort('price')}
                            >
                                Price
                                {sortConfig.key === 'price' && (sortConfig.direction === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />)}
                            </TableCell>
                            <TableCell
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleSort('tag')}
                            >
                                Tag
                                {sortConfig.key === 'tag' && (sortConfig.direction === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />)}
                            </TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedProducts.map((product) => (
                            <TableRow key={product.code}>
                                <TableCell>{product.code}</TableCell>
                                <TableCell>{product.productTranslations[0].name}</TableCell>
                                <TableCell>${product.price.toFixed(2)}</TableCell>
                                <TableCell>{/* Tag representation, if available in the fetched data */}</TableCell>
                                <TableCell>
                                    <IconButton onClick={() => handleEdit(product)}>
                                        <EditIcon color="primary" />
                                    </IconButton>
                                    {/* If deactivate logic is added in the future, the button can be activated */}
                                    {/* <IconButton>
                                        <BlockIcon color="secondary" />
                                    </IconButton> */}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <EditProductDialog
                product={selectedProduct}
                onSave={handleSave}
                onClose={() => setSelectedProduct(null)}
            />
        </Container>
    );
}

export default ProductsAdmin;
