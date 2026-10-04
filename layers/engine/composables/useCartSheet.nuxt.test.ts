// useCartSheet: dialog behaviour of the mobile cart sheet: it is open only on mobile, locks and inerts the page behind,
// traps focus with the close button first, closes on Escape, and gives focus back to the control that opened it, unless
// the visitor followed a link out of the sheet. The three page-level helpers (scroll lock, inert, focus trap) are the
// boundary: they are replaced by spies, and the options passed to the trap are exercised as the trap would use them.
// Run: `vp test run layers/engine/composables/useCartSheet.nuxt.test.ts`.
import { createPinia, setActivePinia } from 'pinia'
import { type Ref, effectScope, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { setFlags } from '../../../test/flags'
import { useCartStore } from '#engine/stores/cart'

interface TrapOptions {
  initialFocus: () => HTMLElement | null
  returnFocus: () => HTMLElement | null | false
  onEscape: () => void
  companions: () => Element[]
}

const mocks = await vi.hoisted(async () => {
  const { reactive, ref } = await import('vue')
  return {
    isDesktop: ref(false),
    route: reactive({ path: '/menu' }),
    guards: [] as ((to: { path: string }) => void)[],
    removeGuard: vi.fn(),
    scrollLock: vi.fn(),
    inert: vi.fn(),
    trap: vi.fn(),
  }
})

vi.mock('@vueuse/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@vueuse/core')>()),
  useMediaQuery: () => mocks.isDesktop,
}))
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => mocks.route,
  useRouter: () => ({
    beforeEach: (guard: (to: { path: string }) => void) => {
      mocks.guards.push(guard)
      return mocks.removeGuard
    },
  }),
}))
vi.mock('#engine/composables/useBodyScrollLock', () => ({ useBodyScrollLock: mocks.scrollLock }))
vi.mock('#engine/composables/useInertBackground', () => ({ useInertBackground: mocks.inert }))
vi.mock('#engine/composables/useFocusTrap', () => ({ useFocusTrap: mocks.trap }))

const { useCartSheet } = await import('#engine/composables/useCartSheet')

let scope: ReturnType<typeof effectScope>
let panel: Ref<HTMLElement | null>
let closeButton: Ref<HTMLElement | null>
let cart: ReturnType<typeof useCartStore>

const mount = () => {
  scope = effectScope()
  return scope.run(() => useCartSheet(panel, closeButton))!
}
const trapTarget = () => (mocks.trap.mock.calls[0]![0] as Ref<HTMLElement | null>).value
const trapOptions = () => mocks.trap.mock.calls[0]![1] as TrapOptions
/** Happy-dom has no layout: say whether an element is on screen (display: none has no client rects). */
const rendered = <T extends HTMLElement>(el: T): T => {
  el.getClientRects = () => [{}] as unknown as DOMRectList
  return el
}
const hidden = <T extends HTMLElement>(el: T): T => {
  el.getClientRects = () => [] as unknown as DOMRectList
  return el
}
const button = (id: string, attrs: Record<string, string> = {}) => {
  const el = document.createElement('button')
  el.id = id
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value)
  document.body.append(el)
  return el
}

beforeEach(() => {
  setActivePinia(createPinia())
  cart = useCartStore()
  Object.values(mocks).forEach((m) => typeof m === 'function' && 'mockReset' in m && m.mockReset())
  mocks.guards.length = 0
  mocks.isDesktop.value = false
  mocks.route.path = '/menu'
  panel = ref(document.createElement('div'))
  closeButton = ref(document.createElement('button'))
})
afterEach(() => {
  scope.stop()
  document.body.innerHTML = ''
})

describe('isSheetOpen', () => {
  it('is open only while the cart is visible AND the viewport is mobile', () => {
    const { isSheetOpen } = mount()
    expect(isSheetOpen.value).toBe(false)
    cart.setCartVisibility(true)
    expect(isSheetOpen.value).toBe(true)
    mocks.isDesktop.value = true
    expect(isSheetOpen.value).toBe(false)
    mocks.isDesktop.value = false
    expect(isSheetOpen.value).toBe(true)
  })

  it('on desktop the same store flag opens nothing', () => {
    mocks.isDesktop.value = true
    cart.setCartVisibility(true)
    expect(mount().isSheetOpen.value).toBe(false)
  })

  it('locks the page scroll and makes the page behind inert with the same flag', () => {
    const { isSheetOpen } = mount()
    expect(mocks.scrollLock).toHaveBeenCalledWith(isSheetOpen)
    expect(mocks.inert).toHaveBeenCalledWith(isSheetOpen)
  })
})

describe('focus trap', () => {
  it('traps the panel on mobile, and nothing on desktop', () => {
    mount()
    expect(trapTarget()).toBe(panel.value)
    scope.stop()
    mocks.trap.mockReset()
    mocks.isDesktop.value = true
    mount()
    expect(trapTarget()).toBeNull()
  })

  it('puts focus on the close button first', () => {
    mount()
    expect(trapOptions().initialFocus()).toBe(closeButton.value)
    closeButton.value = null
    expect(trapOptions().initialFocus()).toBeNull()
  })

  it('Escape closes the sheet', () => {
    mount()
    cart.setCartVisibility(true)
    trapOptions().onEscape()
    expect(cart.isCartVisible).toBe(false)
  })

  it('the companions of the trap are the elements marked data-focus-trap-companion', () => {
    mount()
    const a = button('a', { 'data-focus-trap-companion': '' })
    button('b')
    const c = button('c', { 'data-focus-trap-companion': '' })
    expect(trapOptions().companions()).toEqual([a, c])
  })
})

describe('where focus returns', () => {
  const open = async () => {
    cart.setCartVisibility(true)
    await nextTick()
  }

  it('to the control that opened the sheet', async () => {
    const opener = rendered(button('opener', { 'data-cart-trigger': '' }))
    opener.focus()
    mount()
    await open()
    expect(trapOptions().returnFocus()).toBe(opener)
  })

  it('reads the opener the moment the sheet opens, even if focus moves on afterwards', async () => {
    const opener = rendered(button('opener'))
    const inside = button('inside')
    opener.focus()
    mount()
    await open()
    inside.focus()
    expect(trapOptions().returnFocus()).toBe(opener)
  })

  it('falls back to the cart trigger on screen when the opener is gone from the page', async () => {
    const opener = rendered(button('opener'))
    const trigger = rendered(button('trigger', { 'data-cart-trigger': '' }))
    opener.focus()
    mount()
    await open()
    opener.remove()
    expect(trapOptions().returnFocus()).toBe(trigger)
  })

  it('falls back to the cart trigger when the opener is not on screen (display: none)', async () => {
    const opener = hidden(button('opener'))
    hidden(button('hidden-trigger', { 'data-cart-trigger': '' })) // The desktop trigger is not on screen either
    const trigger = rendered(button('trigger', { 'data-cart-trigger': '' }))
    opener.focus()
    mount()
    await open()
    expect(trapOptions().returnFocus()).toBe(trigger)
  })

  it('Safari does not focus a button on click: with nothing focused it still finds the trigger on screen', async () => {
    const trigger = rendered(button('trigger', { 'data-cart-trigger': '' }))
    ;(document.activeElement as HTMLElement | null)?.blur()
    mount()
    await open()
    expect(trapOptions().returnFocus()).toBe(trigger)
  })

  it('null when there is nothing to return to', async () => {
    mount()
    await open()
    expect(trapOptions().returnFocus()).toBeNull()
  })

  it('never to the page the visitor left: following a link out of the sheet disables the return', async () => {
    const opener = rendered(button('opener'))
    opener.focus()
    mount()
    await open()
    expect(mocks.guards).toHaveLength(1)
    mocks.guards[0]!({ path: '/checkout' })
    expect(trapOptions().returnFocus()).toBe(false)
  })

  it('a navigation to the same path (a query change) does not count as leaving', async () => {
    const opener = rendered(button('opener'))
    opener.focus()
    mount()
    await open()
    mocks.guards[0]!({ path: '/menu' })
    expect(trapOptions().returnFocus()).toBe(opener)
  })

  it('a route that is no longer the one the sheet opened on also disables the return', async () => {
    const opener = rendered(button('opener'))
    opener.focus()
    mount()
    await open()
    mocks.route.path = '/cart'
    expect(trapOptions().returnFocus()).toBe(false)
  })

  it('each opening starts afresh: a previous departure does not disable the next return', async () => {
    const opener = rendered(button('opener'))
    opener.focus()
    mount()
    await open()
    mocks.guards[0]!({ path: '/checkout' })
    cart.setCartVisibility(false)
    mocks.route.path = '/checkout'
    opener.focus()
    await open()
    expect(trapOptions().returnFocus()).toBe(opener)
  })

  it('a navigation before the sheet was ever opened is not a departure', async () => {
    const opener = rendered(button('opener'))
    mount()
    mocks.guards[0]!({ path: '/somewhere' })
    opener.focus()
    await open()
    mocks.route.path = '/menu'
    expect(trapOptions().returnFocus()).toBe(opener)
  })

  it('closing the sheet does not forget the opener (the return runs after the leave transition)', async () => {
    const opener = rendered(button('opener'))
    opener.focus()
    mount()
    await open()
    cart.setCartVisibility(false)
    await nextTick()
    expect(trapOptions().returnFocus()).toBe(opener)
  })
})

describe('lifecycle', () => {
  it('removes its navigation guard when the surface goes away', () => {
    mount()
    expect(mocks.removeGuard).not.toHaveBeenCalled()
    scope.stop()
    expect(mocks.removeGuard).toHaveBeenCalledOnce()
    scope = effectScope()
  })

  it('on the server there is no router guard to register', () => {
    setFlags({ server: true })
    mount()
    expect(mocks.guards).toHaveLength(0)
  })
})
