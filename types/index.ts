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
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Order {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  paymentMethod: string;
  molliePaymentId: string;
  molliePaymentUrl: string;
  status: string;
  products: CartItem[];
}