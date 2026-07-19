import type { EventBusKey } from '@vueuse/core'

export interface CartItemAddedPayload {
    productName: string;
    productId: string;
    choiceId?: string;
    selectionSignature?: string;
}

export const cartItemAddedKey: EventBusKey<CartItemAddedPayload> = Symbol('cart-item-added')
