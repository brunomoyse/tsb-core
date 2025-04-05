import mitt from 'mitt';

export type Events = {
    notify: {
        message: string;
        persistent?: boolean;
        duration?: number;
        variant?: string; // 'success' | 'error' | 'info';
    }
};

export const eventBus = mitt<Events>();
