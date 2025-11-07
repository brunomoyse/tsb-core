// types/index.ts

export interface Product {
    categoryId: string;
    code: string | null;
    id: string;
    isAvailable: boolean;
    isDiscountable: boolean;
    isHalal: boolean;
    isVegan: boolean;
    isVisible: boolean
    pieceCount: number | null;
    price: string;
    slug: string;

    description: string | null;
    name: string;

    category: ProductCategory;
}

export interface ProductCategory {
    id: string;
    name: string;
    order: number;
    products: Product[];
}

export interface CartItem {
    product: Product;
    quantity: number;
}

export interface CartState {
    address: Address | null;
    addressExtra: string | null;
    collectionOption: OrderType;
    isCartVisible: boolean;
    orderExtra: { name: string; options?: string[]; }[] | null;
    orderNote: string | null;
    paymentOption: 'ONLINE' | 'CASH';
    preferredReadyTime: string | null;
    products: CartItem[];
}

export interface LoginResponse {
    user: User;
}

export interface User {
    email: string;
    firstName: string;
    id: string;
    lastName: string;
    phoneNumber: string | null;

    address: Address | null;
}

export interface UpdateUserRequest {
    addressId: string | null;
    firstName: string | null;
    lastName: string | null;
    phoneNumber: string | null;
}

export interface CreateUserRequest {
    addressId: string | null;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    phoneNumber: string | null;
}

export type OrderStatus = OrderDeliveryStatus | OrderPickUpStatus;

export type OrderDeliveryStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'AWAITING_PICK_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'FAILED'
export type OrderPickUpStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'AWAITING_PICK_UP' | 'PICKED_UP' | 'CANCELLED' | 'FAILED'
export type OrderType = 'DELIVERY' | 'PICKUP';

export interface Order {
    addressExtra: string | null;
    addressId: string | null;
    createdAt: string;
    deliveryFee: string | null;
    discountAmount: string;
    estimatedReadyTime: string | null;
    id: string;
    isOnlinePayment: boolean;
    orderExtra: { name: string | null; options: string[] | null }[] | null;
    orderNote: string | null;
    paymentID: string | null;
    status: OrderStatus;
    totalPrice: string;
    type: OrderType;
    updatedAt: string;
    userId: string;

    address: Address | null;
    items: OrderProduct[];
    payment: MolliePayment | null;
}

export interface OrderProduct {
    quantity: number;
    totalPrice: string;
    unitPrice: string;

    product: Product;
}

export interface MolliePayment {
    createdAt: string;
    id: string;
    links: object;
    orderId: string;
    paidAt: string | null;
    status: string;
}

export interface CreateOrderRequest {
    addressExtra: string | null;
    addressId: string | null;
    isOnlinePayment: boolean;
    items: { productId: string; quantity: number; }[]
    orderExtra: { name: string; options?: string[] }[] | null;
    orderNote: string | null;
    orderType: OrderType;
    preferredReadyTime: string | null;
}
export interface Street {
    id: string;
    municipalityName: string;
    postcode: string;
    streetName: string;
}

export interface Address {
    boxNumber: string | null;
    distance: number;
    houseNumber: string;
    id: string;
    municipalityName: string;
    postcode: string;
    streetName: string;
}
