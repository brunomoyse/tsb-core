// useCartItemActions: what the cart surfaces do with a line: remove it (with the Undo toast of useCartRemoval) or edit
// it (reopen the product modal prefilled, in the visitor's language).
// Run: `vp test run layers/engine/composables/useCartItemActions.nuxt.test.ts`.
import type * as VueI18NModule from 'vue-i18n'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createPinia, setActivePinia } from 'pinia'
import { useLocalePath, useNuxtApp } from '#imports'
import { makeProduct } from '../../../test/fixtures/catalog'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useCartItemActions } from '#engine/composables/useCartItemActions'
import { useCartItemEdit } from '#engine/composables/useCartItemEdit'
import { useCartStore } from '#engine/stores/cart'
import { useNotificationsStore } from '#engine/stores/notifications'

const navigateTo = vi.hoisted(() => vi.fn())
mockNuxtImport('navigateTo', () => navigateTo)
vi.mock('vue-i18n', async (importOriginal) => {
  const { fakeI18n } = await import('../../../test/helpers/i18n')
  return { ...(await importOriginal<typeof VueI18NModule>()), useI18n: fakeI18n }
})

const track = vi.fn()
const ramen = makeProduct({ id: 'ramen', name: 'Ramen' })

beforeEach(() => {
  setActivePinia(createPinia())
  track.mockReset()
  navigateTo.mockReset().mockResolvedValue(undefined)
  vi.stubGlobal('umami', { track })
  useCartItemEdit().value = null
  useNuxtApp().$i18n.locale.value = 'fr'
})

describe('editItem', () => {
  it('hands a copy of the line to the product modal, closes the cart and opens the menu on that product', async () => {
    const cart = useCartStore()
    cart.addProduct(ramen, 2)
    cart.setCartVisibility(true)
    const line = cart.products[0]!
    await useCartItemActions().editItem(line)

    const editing = useCartItemEdit().value
    expect(editing).toMatchObject({ quantity: 2 })
    expect(editing?.product.id).toBe('ramen')
    // A copy: the modal can change it without touching the line the cart still holds.
    expect(editing).not.toBe(line)
    expect(cart.isCartVisible).toBe(false)
    expect(track).toHaveBeenCalledWith('cart_item_edit_opened', { product_id: 'ramen' })
    expect(navigateTo).toHaveBeenCalledOnce()
    expect(navigateTo).toHaveBeenCalledWith({
      path: useLocalePath()('/menu'),
      query: { product: 'ramen' },
    })
  })

  it('opens the menu of the visitor’s language', async () => {
    useNuxtApp().$i18n.locale.value = 'nl'
    const cart = useCartStore()
    cart.addProduct(ramen, 1)
    await useCartItemActions().editItem(cart.products[0]!)
    const target = navigateTo.mock.calls[0]![0] as { path: string }
    expect(target.path).toBe('/nl/menu')
  })

  it('resolves only once the navigation has finished', async () => {
    let done = false
    navigateTo.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          setTimeout(() => {
            done = true
            resolve()
          }, 0)
        }),
    )
    const cart = useCartStore()
    cart.addProduct(ramen, 1)
    await useCartItemActions().editItem(cart.products[0]!)
    expect(done).toBe(true)
  })
})

describe('removeWithUndo', () => {
  it('removes the line and offers the Undo (the one removal flow of every surface)', () => {
    const cart = useCartStore()
    const notifications = useNotificationsStore()
    cart.addProduct(ramen, 1)
    useCartItemActions().removeWithUndo(cart.products[0]!)
    expect(cart.products).toEqual([])
    expect(notifications.current?.action?.label).toBe('cart.undo')
    notifications.dismiss()
  })
})
