// cartItemAddedKey: the shared bus key; emitters and listeners in different components meet on it.
import { describe, expect, it, vi } from 'vite-plus/test'
import { cartItemAddedKey } from '#engine/composables/useEventBuses'
import { useEventBus } from '@vueuse/core'

describe('cartItemAddedKey', () => {
  it('delivers the payload from one useEventBus caller to another', () => {
    const listener = vi.fn()
    const off = useEventBus(cartItemAddedKey).on(listener)
    useEventBus(cartItemAddedKey).emit({ productName: 'Maki', productId: 'p1', choiceId: 'c1' })
    expect(listener).toHaveBeenCalledOnce()
    expect(listener.mock.calls[0]![0]).toEqual({
      productName: 'Maki',
      productId: 'p1',
      choiceId: 'c1',
    })
    off()
    useEventBus(cartItemAddedKey).emit({ productName: 'Nigiri', productId: 'p2' })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('is a unique symbol: another bus with the same description does not receive it', () => {
    const listener = vi.fn()
    useEventBus(Symbol('cart-item-added')).on(listener)
    useEventBus(cartItemAddedKey).emit({ productName: 'Maki', productId: 'p1' })
    expect(listener).not.toHaveBeenCalled()
  })
})
