interface Product {
    id: string;
    attachments: { path_url: string }[];
    productTranslations: { name: string }[];
    price: number;
    code: string;
    slug: string;
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
