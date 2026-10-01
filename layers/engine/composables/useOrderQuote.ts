import { type MaybeRefOrGetter, computed, onScopeDispose, toValue, watch } from 'vue'
import { type OrderQuote, QUOTE_ORDER_QUERY, couponVerdict, isQuoteBlocking, quoteRequestKey } from '#engine/utils/orderQuote'
import { buildQuoteInput } from '#engine/utils/orderPayload'
import { cartLineKeys } from '#engine/utils/cartLines'
import { createQuoteCycle } from '#engine/utils/quoteCycle'
import { describeCouponRefusal } from '#engine/utils/gqlErrors'
import { reportError } from '#engine/utils/reportError'
import { useAuthStore } from '#engine/stores/auth'
import { useCartStore } from '#engine/stores/cart'
import { useI18n } from 'vue-i18n'
import { useNotificationsStore } from '#engine/stores/notifications'
import { useNuxtApp } from '#imports'
import { useQuoteStore } from '#engine/stores/quote'

/*
 * Keeps the server quote of the cart (`quoteOrder`) up to date and exposes it to the surfaces.
 *
 * Call it from any surface that shows or acts on the cart (checkout, /cart, the drawers); the
 * request cycle is shared, so any number of surfaces mounted at once cost ONE request per change:
 *
 *  - debounced (QUOTE_DEBOUNCE_MS) on every change of what is priced: the lines, the collection
 *    option, the delivery address, the payment option, the slot and the coupon;
 *  - the previous request is aborted, and a response that is not the latest request's is dropped,
 *    so a slow old answer never overwrites a new one;
 *  - while a quote is on its way, or when it failed, the cart surfaces keep showing the client's
 *    maths (`useCartTotals`); only blocking issues of a fresh quote stop the order;
 *  - an older backend without `quoteOrder` is detected once and then never asked again.
 *
 * The coupon of the cart is re-checked by every quote: it follows the basket, and one that stopped
 * applying is removed with a message.
 */

export const QUOTE_DEBOUNCE_MS = 400

type GqlFetch = <T>(query: string, options?: { variables?: Record<string, unknown>; signal?: AbortSignal }) => Promise<T>

/*
 * The one request cycle, module-level so every surface shares it (see utils/quoteCycle.ts for its
 * rules). It is built by the first surface that asks: the Pinia stores, the transport and the i18n
 * function it closes over are app-wide singletons, so any later surface can keep using it.
 */
let cycle: ReturnType<typeof createQuoteCycle> | null = null
let consumers = 0

export interface UseOrderQuoteOptions {
    /** Whether this surface needs the quote now (the drawer only while open). Default: always. */
    active?: MaybeRefOrGetter<boolean>
}

export function useOrderQuote(options: UseOrderQuoteOptions = {}) {
    const cartStore = useCartStore()
    const authStore = useAuthStore()
    const quoteStore = useQuoteStore()
    const notifications = useNotificationsStore()
    // The plugin's `provide` is untyped in this workspace (see the typecheck ratchet): type the one call we make.
    const gqlFetch = (useNuxtApp() as unknown as { $gqlFetch: GqlFetch }).$gqlFetch
    const { t } = useI18n()

    const quoteKey = computed(() =>
        cartStore.products.length > 0 ? quoteRequestKey(buildQuoteInput(cartStore), Boolean(authStore.user)) : '',
    )

    type Translate = (key: string, params?: Record<string, unknown>) => string

    /** The coupon of the cart against a fresh quote: it follows the basket, or goes away with a message. */
    const reconcileCoupon = (quote: OrderQuote, translate: Translate) => {
        const verdict = couponVerdict(quote, cartStore.couponCode)
        if (verdict.kind === 'applied') {
            if (verdict.discountCents !== cartStore.couponDiscountCents) cartStore.couponDiscountCents = verdict.discountCents
        } else if (verdict.kind === 'refused') {
            const code = cartStore.couponCode ?? ''
            const refusal = describeCouponRefusal({ valid: false, errorCode: verdict.errorCode })
            cartStore.couponCode = null
            cartStore.couponDiscountCents = 0
            notifications.notify({
                message: translate('coupon.removedNoLongerApplies', { code, reason: translate(refusal.key, refusal.params ?? {}) }),
                variant: 'warning',
                duration: 7000,
            })
        }
    }

    cycle ??= createQuoteCycle({
        store: () => quoteStore,
        debounceMs: QUOTE_DEBOUNCE_MS,
        send: async (input, signal) => (await gqlFetch<{ quoteOrder: OrderQuote }>(QUOTE_ORDER_QUERY, { variables: { input }, signal })).quoteOrder,
        // Only against the quote of the CURRENT cart: a coupon removal re-quotes right after.
        isCurrent: (request) => request.key === quoteStore.wantedKey,
        onQuote: (quote) => reconcileCoupon(quote, t as Translate),
        onError: (err) => reportError(err, 'cart.quote'),
    })

    const schedule = () => {
        if (!toValue(options.active ?? true)) return
        const key = quoteKey.value
        cycle?.request(key === '' ? null : {
            key,
            input: buildQuoteInput(cartStore),
            lineKeys: cartLineKeys(cartStore.products),
        })
    }

    if (import.meta.client) {
        consumers += 1
        watch([quoteKey, () => toValue(options.active ?? true)], schedule, { immediate: true })
        onScopeDispose(() => {
            consumers -= 1
            // Nobody shows a quote any more: stop asking (the next surface restarts the cycle).
            if (consumers <= 0) {
                consumers = 0
                cycle?.stop()
            }
        })
    }

    const quote = computed(() => quoteStore.quote)
    /** The quote of the current inputs, null while pending / failed / not asked (surfaces then use the client's maths). */
    const freshQuote = computed(() => quoteStore.freshQuote)
    const pending = computed(() => quoteStore.pending)
    /** The order cannot be placed now: a quote is on its way, or the fresh one has blocking issues. */
    const blocked = computed(() => quoteStore.pending || (quoteStore.freshQuote !== null && isQuoteBlocking(quoteStore.freshQuote)))

    return {
        quote,
        freshQuote,
        pending,
        error: computed(() => quoteStore.error),
        blocked,
        /** Issues of the cart lines by line key (see `cartLineKeys`). */
        lineIssues: computed(() => quoteStore.lineIssues),
    }
}
