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
    id: string;
    product: ProductInfo;
    quantity: number;
  }
  
  export interface CartState {
    products: CartItem[];
    isCartVisible: boolean;
  }