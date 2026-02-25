import mitt from 'mitt'

export interface Events {
    notify: {
        message: string;
        persistent?: boolean;
        duration?: number;
        variant?: string; // 'success' | 'error' | 'info';
    }
    'cart-item-added': {
        productName: string;
        productId: string;
        choiceId?: string;
    }
}

export const eventBus = mitt<Events>();
