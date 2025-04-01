// types/index.ts

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    code: string;
    slug: string;
    pieceCount: number;
    isHalal: boolean;
    isVegan: boolean;
    isAvailable: boolean;
    categoryId: string;
    discountable: boolean;
    category?: ProductCategory | null;
}

export interface ProductCategory {
    id: string;
    name: string;
    order: number;
}

export interface CartItem {
    product: Product;
    quantity: number;
}

export interface OrderProductLine {
    product : {
        id: string;
        code: string;
        categoryName: string;
        name: string;
    },
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}

export interface CartState {
    products: CartItem[];
    isCartVisible: boolean;
    deliveryOption: 'delivery' | 'pickup';
}

export interface LoginResponse {
    user: User;
}

export interface User {
    id: string;
    email: string;
    name: string;
    address: string;
    phoneNumber: string;
}

export interface Order {
    id: string;
    createdAt: string;
    updatedAt: string;
    userId: string;
    deliveryOption: string;
    paymentMethod: string;
    molliePaymentId: string;
    molliePaymentUrl: string;
    status: OrderStatus;
    products: OrderProductLine[];
}

export type OrderStatus = OrderDeliveryStatus | OrderPickUpStatus;

export type OrderDeliveryStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'AWAITING_PICK_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'FAILED'
export type OrderPickUpStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'AWAITING_PICK_UP' | 'PICKED_UP' | 'CANCELLED' | 'FAILED'
