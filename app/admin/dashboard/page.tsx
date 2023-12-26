"use client";

import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Button} from "@/components/ui/button";
import {Skeleton} from "@/components/ui/skeleton";
import {Switch} from "@/components/ui/switch"
import {PRODUCTS_QUERY} from "@/graphql/queries";
import {formatPrice} from '@/lib/utils/utils';
import {useLazyQuery, useMutation} from "@apollo/client";
import React, {Suspense, useEffect, useState} from "react";
import {UPDATE_PRODUCT_MUTATION} from "@/graphql/mutations";
import {Input} from "@/components/ui/input";
const ProductModal = React.lazy(() => import('./ProductModal').then(module => ({ default: module.ProductModal })));


export default function Page() {
    const [page, setPage] = useState(1);
    const [products, setProducts] = useState<Product[]>([]);
    const [paginatorInfo, setPaginatorInfo] = useState<PaginatorInfo|null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product|null>(null);

    const skeletonRows = 20;

    // Function to open the product editor in "add" mode
    const openAddProductDialog = () => {
        // Set up the logic to open the editor for a new product
        setSelectedProduct(null);
        setIsEditing(true);
    };

    const [updateProduct] = useMutation(UPDATE_PRODUCT_MUTATION);

    const [getPaginatedData, { loading, data, error }] = useLazyQuery(PRODUCTS_QUERY, {
        variables: { locale: 'FR', first: 10, page },
        fetchPolicy: 'no-cache',
        onCompleted: (data) => {
            setProducts(data.products.data);
            setPaginatorInfo(data.products.paginatorInfo);
        },
        onError: (error) => {
            console.error('Error fetching products:', error);
        }
    });

    // Trigger initial fetch
    useEffect(() => {
        getPaginatedData();
    }, [getPaginatedData]);

    // Reset selected product when dialog closes
    useEffect(() => {
        if (!isEditing) {
            setSelectedProduct(null);
        }
    }, [isEditing, setSelectedProduct]);

    const handleFetchData = async (type: 'next' | 'previous' | 'none') => {
        if (loading) return;

        const newPage = type === 'next' ? page + 1 : type === 'previous' ? page - 1 : page;
        if ((type === 'next' && !paginatorInfo?.hasMorePages) ||
            (type === 'previous' && paginatorInfo?.currentPage === 1)) {
            return; // No need to fetch data if it's the first page or there are no more pages
        }

        await getPaginatedData({ variables: { locale: 'FR', page: newPage } });
        setPage(newPage);
    };

    const openProductEditor = (product: Product) => {
        setSelectedProduct(product);
        setIsEditing(true);
    }

    const toggleProductActivation = async (product: Product) => {
        await updateProduct({
            variables: {
                id: product.id,
                input: {
                    isActive: !product.isActive
                }
            },
        });
        setProducts(products.map((p: Product) => {
            if (p.id === product.id) {
                p.isActive = !p.isActive;
            }

            return p;
        }));
    }

    const handleProductUpdate = () => {
        setSelectedProduct(null);
        handleFetchData('none');
    };

    // Additional state to manage the search term
    const [searchTerm, setSearchTerm] = useState('');

    // State to store the timeout ID
    const [searchTimeout, setSearchTimeout] = useState<number | null>(null);

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);

        // Clear any existing timeout to reset the timer
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        // Set a new timeout
        const newTimeout = window.setTimeout(() => { // using window.setTimeout to ensure correct typing
            getPaginatedData({ variables: { locale: 'FR', first: 10, page, search: event.target.value } });
        }, 500); // delay

        // Store the timeout ID so it can be cleared if needed
        setSearchTimeout(newTimeout);
    };

    useEffect(() => {
        return () => {
            // Clean up the timeout when the component unmounts
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
        };
    }, [searchTimeout]);


    if (error) return <p>Error occurred: {error.message}</p>;

    return (
        <main className="flex flex-col justify-between p-24 bg-white text-black h-screen">
            <div className="flex justify-between mb-4">
                <Input
                    type="text"
                    placeholder="Rechercher par nom..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="p-2 border rounded w-80"
                />
                <Button
                    onClick={openAddProductDialog}
                >
                    Ajouter un produit
                </Button>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[100px]">Code</TableHead>
                        <TableHead>Catégorie (FR)</TableHead>
                        <TableHead>Nom (FR)</TableHead>
                        <TableHead>Prix</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading
                        ? Array.from({ length: skeletonRows }, (_, index) => (
                            <TableRow key={index}>
                                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            </TableRow>
                        ))
                        : products.map((product: Product) => (
                            <TableRow key={product.id} className={!product.isActive ? 'hover:bg-gray-200 bg-gray-200 italic text-gray-500' : ''}>
                                <TableCell className="font-medium">{product.code}</TableCell>
                                <TableCell>{product.productTags[0].productTagTranslations.find(p => p.locale === 'FR')?.name}</TableCell>
                                <TableCell>{product.productTranslations?.find(p => p.locale === 'FR')?.name}</TableCell>
                                <TableCell>{formatPrice(product.price)}</TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        className='bg-transparent'
                                        variant="secondary"
                                        onClick={() => openProductEditor(product)}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                                        </svg>
                                    </Button>
                                    <Switch
                                        checked={product.isActive}
                                        onCheckedChange={() => toggleProductActivation(product)}
                                    />
                                </TableCell>
                            </TableRow>
                        ))
                    }
                </TableBody>
            </Table>
            <div className="flex items-center justify-between space-x-2 py-4">
                <Button
                    className='bg-transparent'
                    variant="outline"
                    disabled={paginatorInfo?.currentPage === 1}
                    onClick={() => handleFetchData('previous')}
                >Previous</Button>
                <p>{paginatorInfo?.firstItem} - {paginatorInfo?.lastItem} ({paginatorInfo?.total})</p>
                <Button
                    className='bg-transparent'
                    variant="outline"
                    disabled={!paginatorInfo?.hasMorePages}
                    onClick={() => handleFetchData('next')}
                >Next</Button>
            </div>

            <Suspense fallback={<div>Loading...</div>}>
                <ProductModal
                    isEditing={isEditing}
                    onOpenChange={setIsEditing}
                    selectedProduct={selectedProduct}
                    onProductUpdate={handleProductUpdate}
                />
            </Suspense>

        </main>
    );
}
