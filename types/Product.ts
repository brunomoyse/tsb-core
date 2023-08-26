interface Product {
    id: string;
    attachments: { path_url: string }[];
    productTranslations: { name: string }[];
    price: number;
    code: string;
    slug: string;
    isActive: boolean;
}

interface ProductTag {
    id: string;
    productTagTranslations: { name: string }[];
    products: Product[];
}

interface CartItem {
    id: string;
    product: Product;
    quantity: number;
}

interface CartState {
    products: CartItem[];
    //totalPrice: number;
}
