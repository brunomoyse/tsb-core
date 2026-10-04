// Cart-notices plugin: tells the customer, once, that lines of their saved cart could not be recovered when it was loaded.
// Waits for the app to be mounted (the toast host and the translation function exist by then); the cart store counts the
// Dropped lines in `droppedOnHydrate` and the plugin resets it after announcing, so the same loss is not announced twice.
// Run: `vp test run layers/engine/plugins/cart-notices.client.nuxt.test.ts`.
import { createPinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { useCartStore } from '#engine/stores/cart'
import { useNotificationsStore } from '#engine/stores/notifications'
import plugin from './cart-notices.client'

type Hook = () => void
const pinia = createPinia()

/** A fake Nuxt app that records the `app:mounted` hook, to be run when the test says the app is mounted. */
const install = () => {
  const hooks: Record<string, Hook> = {}
  const nuxtApp = {
    $pinia: pinia,
    $i18n: { t: (key: string) => `t:${key}` },
    hook: (name: string, callback: Hook) => {
      hooks[name] = callback
    },
  }
  ;(plugin as unknown as (app: typeof nuxtApp) => void)(nuxtApp)
  return {
    mount: () => {
      hooks['app:mounted']!()
    },
    hooks,
  }
}

beforeEach(() => {
  pinia.state.value = {}
  const cart = useCartStore(pinia)
  cart.droppedOnHydrate = 0
  useNotificationsStore(pinia).dismiss()
})

describe('cart-notices plugin', () => {
  it('does nothing until the app is mounted', () => {
    const { hooks } = install()
    useCartStore(pinia).droppedOnHydrate = 2
    expect(Object.keys(hooks)).toEqual(['app:mounted'])
    expect(useNotificationsStore(pinia).current).toBeNull()
  })

  it('once mounted, a cart that lost lines on load says so in a warning, and the count is reset', () => {
    useCartStore(pinia).droppedOnHydrate = 2
    const { mount } = install()
    mount()
    const toast = useNotificationsStore(pinia).current
    expect(toast).toMatchObject({
      message: 't:cart.removedUnavailable',
      variant: 'warning',
      duration: 8000,
    })
    expect(useCartStore(pinia).droppedOnHydrate).toBe(0)
  })

  it('a cart that lost nothing says nothing', () => {
    const { mount } = install()
    mount()
    expect(useNotificationsStore(pinia).current).toBeNull()
  })

  it('a late hydration (the count set after mount) is announced as well, once', async () => {
    const { mount } = install()
    mount()
    useCartStore(pinia).droppedOnHydrate = 1
    await nextTick()
    const notifications = useNotificationsStore(pinia)
    expect(notifications.current?.message).toBe('t:cart.removedUnavailable')
    expect(notifications.queue).toEqual([])
    expect(useCartStore(pinia).droppedOnHydrate).toBe(0)
    await nextTick() // The reset to 0 re-runs the watcher: it must not announce again
    expect(notifications.queue).toEqual([])
  })
})
