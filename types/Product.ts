interface Product {
    id: string;
    attachments: { path_url: string }[];
    productTranslations: {
        name: string
        description: string
        locale: string
    }[];
    productTags: ProductTag[];
    price: number;
    code: string;
    slug: string;
    isActive: boolean;
    preview: Attachment
}

interface Attachment {
    id: string;
    path: string;
}

interface ProductTag {
    id: string;
    productTagTranslations: {
        name: string
        description: string
        locale: string
    }[];
    products: Product[];
}

interface CartItem {
    id: string;
    product: Product;
    quantity: number;
}

interface CartState {
    products: CartItem[];
    isCartVisible: boolean;
    //totalPrice: number;
}
