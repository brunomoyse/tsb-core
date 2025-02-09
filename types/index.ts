// types/index.ts

export interface Product {
  id: string;
  price: number;
  code: string;
  slug: string;
  isActive: boolean;
}

export interface ProductTranslation {
  id: string;
  name: string;
  description: string;
  locale: string;
}

export interface ProductInfo {
  id: string;
  name: string;
  description: string;
  price: number;
  code: string;
  slug: string;
  pieces: number;
  // Pluged from parent
  category: ProductCategory;
}

export interface ProductCategory {
  id: string;
  name: string;
  order: number;
}

export interface CategoryWithProducts {
  id: string;
  name: string;
  order: number;
  products: ProductInfo[];
}

export interface CartItem {
  product: ProductInfo;
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
  items: CartItem[];
}