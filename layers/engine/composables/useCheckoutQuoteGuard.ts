import { refreshQuote, requestQuoteRefresh } from '#engine/composables/useOrderQuote'
import { useEventListener, useIntervalFn } from '@vueuse/core'
import { recheckQuote } from '#engine/utils/orderQuote'
import { useI18n } from 'vue-i18n'
import { useNotificationsStore } from '#engine/stores/notifications'

/** While the checkout is visible, the quote is asked again this often (prices / availability change on the server). */
export const QUOTE_RECHECK_INTERVAL_MS = 60_000

/*
 * Keeps the quote of the checkout honest about SERVER-side changes (audit J2): the quote cycle only
 * re-asks when the cart changes, so a price edited, a product sold out or the kitchen closing while
 * the customer reads the page would go unnoticed until createOrder fails (or worse, charges more).
 *
 *  - while the page is visible the quote is refreshed every 60 s, and when the tab comes back to the
 *    foreground (a phone woken up, a tab revisited); the restaurant config subscription does the
 *    same through `requestQuoteRefresh` (see useRestaurantConfig);
 *  - `confirmBeforeOrder(displayedCents)` is the last check before `createOrder`: it forces a fresh
 *    quote and says whether the order may go on. When the server now reports an issue, or a total
 *    that is not the one the customer was looking at, it tells the customer and the order does NOT
 *    go out (the page then shows the updated numbers). When the check itself fails (network, timeout,
 *    an older backend without `quoteOrder`) the order goes on as it always did.
 *
 * Call it from the checkout page's setup, next to `useOrderQuote()`; it does nothing on the server.
 * The interval and the listener are VueUse's: they stop with the page.
 */
export function useCheckoutQuoteGuard() {
    const { t } = useI18n()
    const notifications = useNotificationsStore()

    if (import.meta.client) {
        const isVisible = () => document.visibilityState === 'visible'
        useIntervalFn(() => {
            if (isVisible()) requestQuoteRefresh(QUOTE_RECHECK_INTERVAL_MS / 2)
        }, QUOTE_RECHECK_INTERVAL_MS)
        useEventListener(document, 'visibilitychange', () => {
            if (isVisible()) requestQuoteRefresh()
        })
    }

    /** True when the order may be created now. `displayedPayableCents` is what the customer sees BEFORE the refresh. */
    const confirmBeforeOrder = async (displayedPayableCents: number): Promise<boolean> => {
        const quote = await refreshQuote()
        if (!quote) return true
        if (recheckQuote(quote, displayedPayableCents) === 'ok') return true
        notifications.notify({
            message: t('checkout.quoteChanged'),
            persistent: false,
            duration: 7000,
            variant: 'warning',
        })
        return false
    }

    return { confirmBeforeOrder }
}
