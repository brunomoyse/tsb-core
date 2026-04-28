import mitt from 'mitt'

export interface Events {
    notify: {
        message: string;
        persistent?: boolean;
        duration?: number;
        variant?: string; // 'success' | 'error' | 'info';
        action?: {
            label: string;
            handler: () => void;
        };
    }
    'cart-item-added': {
        productName: string;
        productId: string;
        choiceId?: string;
        selectionSignature?: string;
    }
    'order-status-push': {
        orderId: string;
    }
}

export const eventBus = mitt<Events>();
