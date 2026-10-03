import type { CartItem } from '@/types'
import type { Ref } from 'vue'
import { useState } from '#imports'

/*
 * The customized cart line currently being edited, if any. The cart sets it
 * before opening the product modal; the modal prefills from it and replaces
 * the line on confirm, then clears it.
 */
export const useCartItemEdit = (): Ref<CartItem | null> =>
  useState<CartItem | null>('cart-item-edit', () => null)
