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

export interface CartState {
    products: CartItem[];
    isCartVisible: boolean;
    deliveryOption: 'DELIVERY' | 'PICKUP';
}

export interface LoginResponse {
    user: User;
}

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    address: Address | null;
    phoneNumber: string | null;
}

export interface UpdateUserRequest {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string | null;
    addressId: string | null;
}

export type OrderStatus = OrderDeliveryStatus | OrderPickUpStatus;

export type OrderDeliveryStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'AWAITING_PICK_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'FAILED'
export type OrderPickUpStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'AWAITING_PICK_UP' | 'PICKED_UP' | 'CANCELLED' | 'FAILED'
export type OrderType = 'DELIVERY' | 'PICKUP';

export interface Order {
    id: string;
    createdAt: string;
    updatedAt: string;
    userId: string;
    orderStatus: OrderStatus;
    orderType: OrderType;
    isOnlinePayment: boolean;
    paymentID: string | null;
    discountAmount: string;
    deliveryFee: string | null;
    totalPrice: string;
    estimatedReadyTime: string | null;
    addressId: string | null;
    addressExtra: string | null;
    extraComment: string | null;
    orderExtra: {
        name: string | null
        options: string[] | null
    }[] | null;
}

export interface OrderProduct {
    product: {
        id: string;
        code: string | null;
        categoryName: string
        name: string;
    };
    quantity: number;
    unitPrice: string;
    totalPrice: string;
}

export interface MolliePayment {
    id: string;
    paymentUrl: string;
    orderId: string;
    status: string;
    createdAt: string;
    paidAt: string | null;
}

export interface OrderResponse {
    order: Order;
    products: OrderProduct[];
    payment: MolliePayment | null;
    address: Address | null;
}

export interface CreateOrderRequest {
    orderType: OrderType;
    isOnlinePayment: boolean;
    addressId: string | null;
    addressExtra: string | null;
    extraComment: string | null;
    orderExtra: {
        name: string
        options?: string[]
    }[] | null;
    orderProducts: {
        productId: string;
        quantity: number;
    }[]
}
export interface Street {
    id: string;
    streetName: string;
    municipalityName: string;
    postcode: string;
}

export interface Address {
    id: string;
    streetName: string;
    houseNumber: string;
    boxNumber: string | null;
    municipalityName: string;
    postcode: string;
    distance: number;
}
