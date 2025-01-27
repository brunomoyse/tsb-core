interface Product {
    id: string;
    price: number;
    code: string;
    slug: string;
    isActive: boolean;
}

interface ProductTranslation {
    id: string;
    name: string;
    description: string;
    locale: string;
}

interface ProductInfo {
    id: string;
    name: string;
    description: string;
    price: number;
    code: string;
    slug: string;
}

interface ProductCategory {
    id: string;
    name: string;
    order: number;
}

interface CategoryWithProducts {
    id: string;
    name: string;
    order: number;
    products: ProductInfo[];
}

interface CartItem {
    id: string;
    product: ProductInfo;
    quantity: number;
}

interface CartState {
    products: CartItem[];
    isCartVisible: boolean;
    //totalPrice: number;
}




