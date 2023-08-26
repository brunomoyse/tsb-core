"use client";

import { Container, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { useState } from 'react';

const initialOrders = [
    { id: 1, customerName: 'John', totalAmount: 100, products: ['Product 1'] },
    // ... add more initial orders if necessary
];

const OrdersAdmin = () => {
    const [orders, setOrders] = useState(initialOrders);

    return (
        <Container>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Customer Name</TableCell>
                            <TableCell>Total Amount</TableCell>
                            <TableCell>Products</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {orders.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell>{order.id}</TableCell>
                                <TableCell>{order.customerName}</TableCell>
                                <TableCell>${order.totalAmount.toFixed(2)}</TableCell>
                                <TableCell>{order.products.join(', ')}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Container>
    );
}

export default OrdersAdmin;
