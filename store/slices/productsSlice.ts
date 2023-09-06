import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import client from '@/lib/client'
import gql from 'graphql-tag';

interface ProductsState {
    products: Product[];
    loading: boolean;
    error: null | string;
    currentProduct: null | Product;
    isProductDialogOpen: boolean;
}

const initialState: ProductsState = {
    products: [],
    loading: false,
    error: null,
    currentProduct: null,
    isProductDialogOpen: false,
};

// Async thunks

// Fetch Products
export const fetchProducts = createAsyncThunk(
    'products/fetch',
    async () => {
        const query = gql`
            query Products($first: Int!, $lang: Language!, $tags: [ID!], $search: String, $page: Int) {
                products(
                    first: $first
                    page: $page
                    lang: $lang
                    tags: $tags
                    search: $search
                ) {
                    data {
                        id
                        price
                        code
                        slug
                        productTranslations(language: $lang) {
                            name
                            language
                        }
                    }
                }
            }`;

        const variables = {
            first: -1,
            page: 1,
            lang: "FR"
        };

        const response = await client.query({ query, variables });
        return response.data.products.data;
    }
);

// Edit Product
export const editProduct = createAsyncThunk(
    'products/edit',
    async (product: Product) => {
        const mutation = gql`
            mutation ($id: ID!, $input: UpdateProductInput!) {
                updateProduct(id: $id, input: $input) {
                    id
                    price
                    code
                    slug
                    productTranslations {
                        name
                    }
                }
            }
        `;

        const input = {
            price: product.price,
            is_active: product.isActive,
            code: product.code,
            slug: product.slug,
        };

        const variables = {
            id: product.id,
            input: input
        };

        const response = await client.mutate({ mutation, variables });
        return response.data.updateProduct;
    }
);

// Slice
const productsSlice = createSlice({
    name: 'products',
    initialState,
    reducers: {
        setCurrentProduct: (state, action: PayloadAction<Product | null>) => {
            state.currentProduct = action.payload;
        },
        toggleProductDialog: (state) => {
            state.isProductDialogOpen = !state.isProductDialogOpen;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchProducts.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchProducts.fulfilled, (state, action: PayloadAction<Product[]>) => {
                state.loading = false;
                state.products = action.payload;
            })
            .addCase(fetchProducts.rejected, (state, action) => {
                state.loading = false;
                /* @ts-ignore */
                state.error = action.error.message;
            })
            .addCase(editProduct.fulfilled, (state, action: PayloadAction<Product>) => {
                const index = state.products.findIndex(p => p.id === action.payload.id);
                if (index !== -1) {
                    state.products[index] = action.payload;
                }
            });
    },
});
export const { setCurrentProduct, toggleProductDialog } = productsSlice.actions;

export default productsSlice.reducer;
