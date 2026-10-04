// useCheckoutQuoteGuard: keeps the checkout honest about SERVER-side changes. While the page is visible the quote is
// refreshed every 60 s and when the tab comes back; `confirmBeforeOrder` is the last check before createOrder: it says
// whether the order may go on, and tells the customer when the server now disagrees with what they were looking at.
// The quote composable is the boundary (its refresh functions are spies); stores, VueUse and the clock are real.
// Run: `vp test run layers/engine/composables/useCheckoutQuoteGuard.nuxt.test.ts`.
import type * as VueI18NModule from 'vue-i18n'
import { type EffectScope, effectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createPinia, setActivePinia } from 'pinia'
import { makeQuote, makeQuoteLine } from '../../../test/fixtures/quote'
import type { OrderQuote } from '#engine/utils/orderQuote'
import { setFlags } from '../../../test/flags'
import { useNotificationsStore } from '#engine/stores/notifications'

const quoteFns = vi.hoisted(() => ({ refreshQuote: vi.fn(), requestQuoteRefresh: vi.fn() }))
vi.mock('#engine/composables/useOrderQuote', () => quoteFns)
vi.mock('vue-i18n', async (importOriginal) => {
  const { fakeI18n } = await import('../../../test/helpers/i18n')
  return { ...(await importOriginal<typeof VueI18NModule>()), useI18n: fakeI18n }
})

const { QUOTE_RECHECK_INTERVAL_MS, useCheckoutQuoteGuard } =
  await import('#engine/composables/useCheckoutQuoteGuard')

let scope: EffectScope
let visibility: DocumentVisibilityState

const mount = () => {
  scope = effectScope()
  return scope.run(() => useCheckoutQuoteGuard())!
}
const setVisibility = (state: DocumentVisibilityState) => {
  visibility = state
}
const visibilityChange = () => document.dispatchEvent(new Event('visibilitychange'))

beforeEach(() => {
  setActivePinia(createPinia())
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
  quoteFns.refreshQuote.mockReset()
  quoteFns.requestQuoteRefresh.mockReset()
  visibility = 'visible'
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility)
})
afterEach(() => {
  scope?.stop()
  vi.useRealTimers()
})

describe('confirmBeforeOrder', () => {
  /** The toast on screen (null when the customer was told nothing). */
  const toast = () => useNotificationsStore().current

  it('lets the order go when the fresh quote is what the customer was looking at', async () => {
    quoteFns.refreshQuote.mockResolvedValue(makeQuote({ total: '25.30' }))
    expect(await mount().confirmBeforeOrder(2530)).toBe(true)
    expect(quoteFns.refreshQuote).toHaveBeenCalledOnce()
    expect(toast()).toBeNull()
  })

  it('stops the order and says so when the server total is not the one displayed (a price moved)', async () => {
    quoteFns.refreshQuote.mockResolvedValue(makeQuote({ total: '26.30' }))
    expect(await mount().confirmBeforeOrder(2530)).toBe(false)
    expect(toast()).toMatchObject({
      message: 'checkout.quoteChanged',
      variant: 'warning',
      duration: 7000,
      persistent: false,
    })
    useNotificationsStore().dismiss()
  })

  it('stops the order when the server now reports an issue, even if the total is the same', async () => {
    quoteFns.refreshQuote.mockResolvedValue(
      makeQuote({
        total: '25.30',
        lines: [makeQuoteLine({ issues: [{ code: 'PRODUCT_UNAVAILABLE', currentPrice: null }] })],
      }),
    )
    expect(await mount().confirmBeforeOrder(2530)).toBe(false)
    expect(toast()?.message).toBe('checkout.quoteChanged')
    useNotificationsStore().dismiss()
  })

  it('stops the order on a blocking order-level issue (the kitchen closed, a minimum not met)', async () => {
    quoteFns.refreshQuote.mockResolvedValue(
      makeQuote({
        total: '25.30',
        issues: [{ code: 'DELIVERY_MINIMUM_NOT_MET', minimum: '30.00' }],
      }),
    )
    expect(await mount().confirmBeforeOrder(2530)).toBe(false)
    expect(toast()?.message).toBe('checkout.quoteChanged')
    useNotificationsStore().dismiss()
  })

  it.each(['RESTAURANT_CLOSED', 'ORDERING_UNAVAILABLE'])(
    'stops the order on the order-level issue %s, and tells the customer',
    async (code) => {
      quoteFns.refreshQuote.mockResolvedValue(
        makeQuote({ total: '25.30', issues: [{ code, minimum: null }] }),
      )
      expect(await mount().confirmBeforeOrder(2530)).toBe(false)
      expect(toast()?.message).toBe('checkout.quoteChanged')
      useNotificationsStore().dismiss()
    },
  )

  it("a missing delivery address is the page's to explain: it does not stop the order here", async () => {
    quoteFns.refreshQuote.mockResolvedValue(
      makeQuote({ total: '25.30', issues: [{ code: 'ADDRESS_REQUIRED', minimum: null }] }),
    )
    expect(await mount().confirmBeforeOrder(2530)).toBe(true)
    expect(toast()).toBeNull()
  })

  it.each(['ADDRESS_UNRESOLVABLE', 'ORDER_TOO_MANY_ITEMS'])(
    '%s: the server did not price the order (zeros), so the total is not compared, but the order still does not go out',
    async (code) => {
      quoteFns.refreshQuote.mockResolvedValue(
        makeQuote({ total: '0.00', issues: [{ code, minimum: null }] }),
      )
      expect(await mount().confirmBeforeOrder(2530)).toBe(false)
      expect(toast()?.message).toBe('checkout.quoteChanged')
      useNotificationsStore().dismiss()
    },
  )

  it("a refresh that rejects is the caller's to handle: the guard does not swallow it nor tell the customer anything", async () => {
    const failure = new Error('quote exploded')
    quoteFns.refreshQuote.mockRejectedValue(failure)
    await expect(mount().confirmBeforeOrder(2530)).rejects.toBe(failure)
    expect(toast()).toBeNull()
  })

  it('a quote the totals cannot use has nothing comparable: a different total does not stop the order', async () => {
    const unusable: OrderQuote = makeQuote({
      total: '0.00',
      coupon: { code: 'WELCOME', valid: false, errorCode: 'UNAUTHENTICATED' },
    })
    quoteFns.refreshQuote.mockResolvedValue(unusable)
    expect(await mount().confirmBeforeOrder(2530)).toBe(true)
    expect(toast()).toBeNull()
  })

  it('when the check itself fails (network, timeout, an old backend) the order goes on as it always did', async () => {
    quoteFns.refreshQuote.mockResolvedValue(null)
    expect(await mount().confirmBeforeOrder(2530)).toBe(true)
    expect(toast()).toBeNull()
  })
})

describe('keeping the quote fresh while the checkout is open', () => {
  it('re-asks every 60 s while the page is visible, with half a period as the minimum gap', () => {
    mount()
    expect(QUOTE_RECHECK_INTERVAL_MS).toBe(60_000)
    vi.advanceTimersByTime(59_999)
    expect(quoteFns.requestQuoteRefresh).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(quoteFns.requestQuoteRefresh).toHaveBeenCalledExactlyOnceWith(30_000)
    vi.advanceTimersByTime(60_000)
    expect(quoteFns.requestQuoteRefresh).toHaveBeenCalledTimes(2)
  })

  it('does not poll while the tab is hidden', () => {
    mount()
    setVisibility('hidden')
    vi.advanceTimersByTime(180_000)
    expect(quoteFns.requestQuoteRefresh).not.toHaveBeenCalled()
  })

  it('re-asks when the tab comes back to the foreground (a phone woken up)', () => {
    mount()
    setVisibility('visible')
    visibilityChange()
    expect(quoteFns.requestQuoteRefresh).toHaveBeenCalledExactlyOnceWith()
  })

  it('does not re-ask when the tab goes to the background', () => {
    mount()
    setVisibility('hidden')
    visibilityChange()
    expect(quoteFns.requestQuoteRefresh).not.toHaveBeenCalled()
  })

  it('stops with the page: no interval, no listener', () => {
    mount()
    scope.stop()
    vi.advanceTimersByTime(180_000)
    visibilityChange()
    expect(quoteFns.requestQuoteRefresh).not.toHaveBeenCalled()
  })

  it('does nothing on the server, but confirmBeforeOrder still works', async () => {
    setFlags({ server: true })
    const guard = mount()
    vi.advanceTimersByTime(180_000)
    visibilityChange()
    expect(quoteFns.requestQuoteRefresh).not.toHaveBeenCalled()
    quoteFns.refreshQuote.mockResolvedValue(null)
    expect(await guard.confirmBeforeOrder(100)).toBe(true)
  })
})
