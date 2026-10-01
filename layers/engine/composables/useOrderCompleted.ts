import { type PaymentOutcome, isPaymentProblem, outcomeFromPaymentStatus } from '#engine/lib/paymentOutcome'
import { computed, onMounted, onScopeDispose, ref, watch } from 'vue'
import { useAsyncData, useCartStore, useGqlSubscription, useNuxtApp } from '#imports'
import type { Order } from '#engine/types'
import gql from 'graphql-tag'
import { print } from 'graphql'

/*
 * Shared logic of the /order-completed/[orderId] page (both brands).
 *
 * Mollie redirects back here with a FULL page load for every outcome (paid,
 * canceled, failed, expired, user pressed "back"), so the redirect says nothing
 * and the order query — client-only because SSR has no OIDC token — has not
 * resolved yet when setup runs. Everything below therefore derives from the
 * *loaded* order and never from a snapshot taken in setup/onMounted:
 *
 *   loading   order not loaded yet                       → neutral spinner
 *   error     the order could not be loaded              → error card, cart kept
 *   verifying online order still open/pending            → "verifying" spinner,
 *             (the webhook may be late)                     polled until it settles
 *   problem   canceled / failed / expired / abandoned    → retry screen, cart kept
 *   confirmed paid online order, or any cash order       → celebration, cart cleared
 *
 * The cart is committed (cleared) ONLY in the `confirmed` phase. Mirrors
 * tsb-mobile's post-payment flow (`lib/paymentOutcome.ts`).
 */

export const ORDER_COMPLETED_QUERY = print(gql`
    query ($orderId: ID!) {
        myOrder(id: $orderId) {
            id
            createdAt
            updatedAt
            status
            type
            isOnlinePayment
            discountAmount
            deliveryFee
            totalPrice
            estimatedReadyTime
            addressExtra
            orderNote
            orderExtra
            cancellationReason

            address {
                streetName
                municipalityName
                postcode
            }
            customer {
                id
                firstName
                lastName
            }
            payment {
                status
            }
            items {
                unitPrice
                quantity
                totalPrice
                product {
                    id name code slug price pieceCount isAvailable isDiscountable isHalal isLunchOnly isSpicy isVegetarian isVisible
                    category { id name order }
                    choices { id productId priceModifier sortOrder name }
                }
                choice { id productId priceModifier sortOrder name }
            }
        }
    }
`)

export type OrderCompletedPhase = 'loading' | 'error' | 'verifying' | 'problem' | 'confirmed'

/** Gaps between status checks while an online order is still open/pending (≈17 s in total). */
const VERIFY_DELAYS_MS = [800, 1200, 1500, 2000, 3000, 4000, 5000]
/** Safety-net poll for when the WebSocket subscription fails silently. */
const FALLBACK_POLL_MS = 15_000
const TERMINAL_STATUSES = ['DELIVERED', 'PICKED_UP', 'FAILED', 'CANCELLED']

export function useOrderCompleted(orderId: string) {
    const { $gqlFetch } = useNuxtApp()
    const cartStore = useCartStore()

    const fetchOrder = () => $gqlFetch<{ myOrder: Order }>(ORDER_COMPLETED_QUERY, { variables: { orderId } })

    /* Client-only (SSR has no OIDC token). Deliberately not awaited: nothing
       may be decided from the first render, only from the loaded order. */
    const { data: dataOrder, error: fetchError, refresh } = useAsyncData<{ myOrder: Order }>(
        `order-${orderId}`,
        fetchOrder,
        { server: false },
    )

    const order = computed(() => dataOrder.value?.myOrder ?? null)
    /* A later successful poll can recover from a failed first load, so only
       report the error while there is still no order to show. */
    const orderError = computed(() => (order.value ? null : fetchError.value))

    const mergeOrder = (patch: Partial<Order>) => {
        dataOrder.value = { myOrder: { ...(dataOrder.value?.myOrder ?? {}), ...patch } as Order }
    }

    /* ── Online payment outcome ──
       payment.status (set by the webhook) is the truth. null = nothing to
       report: a cash order, a paid order, or an order that has progressed past
       PENDING (the webhook confirmed it). Only surface a problem while the order
       is still unpaid: an online order is PENDING until paid, and
       CANCELLED/FAILED once payment fails/cancels/expires. */
    const paymentOutcome = computed<PaymentOutcome | null>(() => {
        const o = order.value
        if (!o || !o.isOnlinePayment) return null // Cash orders never have a payment problem
        const out = outcomeFromPaymentStatus(o.payment?.status)
        if (out === 'paid') return null
        if (o.status !== 'PENDING' && o.status !== 'CANCELLED' && o.status !== 'FAILED') return null
        return out
    })

    // Set once the verify loop gave up: the order is still pending, treat as abandoned.
    const verifyExpired = ref(false)

    const phase = computed<OrderCompletedPhase>(() => {
        const o = order.value
        if (!o) return orderError.value ? 'error' : 'loading'
        const out = paymentOutcome.value
        if (out === null) return 'confirmed'
        if (out === 'abandoned' && o.status === 'PENDING' && !verifyExpired.value) return 'verifying'
        return isPaymentProblem(out) ? 'problem' : 'confirmed'
    })

    const paymentProblem = computed(() => phase.value === 'problem')
    // Neutral spinner: either still loading, or waiting for a late webhook.
    const resolvingPayment = computed(() => phase.value === 'loading' || phase.value === 'verifying')

    let disposed = false
    const timers = new Set<ReturnType<typeof setTimeout>>()
    const sleep = (ms: number) => new Promise<void>((resolve) => {
        const id = setTimeout(() => { timers.delete(id); resolve() }, ms)
        timers.add(id)
    })

    /* ── Cart commit ──
       Clear the cart only once the order is known to be committed: a paid online
       order or a cash order. Never on cancelled/failed/expired/abandoned, nor
       while still loading/verifying/errored, so "Try again" keeps the cart. */
    let committed = false
    watch(phase, (p) => {
        if (p !== 'confirmed' || committed || !import.meta.client) return
        committed = true
        cartStore.resetState()
    }, { immediate: true })

    /* ── Verify loop ──
       Returned from Mollie before the webhook landed: re-check the status a few
       times before deciding. Stops as soon as the phase leaves `verifying`
       (subscription/poll update, unmount). If it is still pending when it runs
       out, fall through to the "abandoned" retry screen — the cart is kept. */
    let verifyRunning = false
    const runVerifyLoop = async () => {
        if (verifyRunning) return
        verifyRunning = true
        try {
            for (const delay of VERIFY_DELAYS_MS) {
                await sleep(delay)
                if (disposed || phase.value !== 'verifying') return
                try {
                    const fresh = await fetchOrder()
                    if (fresh?.myOrder) mergeOrder(fresh.myOrder)
                } catch { /* Transient — keep polling */ }
                if (disposed || phase.value !== 'verifying') return
            }
            if (!disposed) verifyExpired.value = true
        } finally {
            verifyRunning = false
        }
    }
    watch(phase, (p) => {
        if (p === 'verifying' && import.meta.client) void runVerifyLoop()
    }, { immediate: true })

    /* ── Live updates ── */
    // Must stay at setup top-level: nesting inside onMounted leaks the
    // WebSocket because onScopeDispose can't bind to the component scope.
    const refetchOnReconnect = async () => {
        try {
            const fresh = await fetchOrder()
            if (fresh?.myOrder) mergeOrder(fresh.myOrder)
        } catch { /* Non-critical */ }
    }

    const { data: liveUpdate } = useGqlSubscription<{
        myOrderUpdated: Partial<Order>
    }>(
        print(gql`
          subscription ($orderId: ID!) {
            myOrderUpdated(orderId: $orderId) { id status updatedAt estimatedReadyTime cancellationReason }
          }
        `),
        { orderId },
        { onReconnect: refetchOnReconnect },
    )

    watch(liveUpdate, (val) => {
        if (val?.myOrderUpdated && dataOrder.value?.myOrder) mergeOrder(val.myOrderUpdated)
    })

    /* ── Polling fallback ──
       If the WebSocket subscription fails silently (CORS, auth, Safari
       timeout), poll every 15 s until the order is in a terminal state. Also
       recovers a failed first load. Started after a delay so the socket gets a
       chance to connect first. */
    let pollTimer: ReturnType<typeof setInterval> | null = null
    let pollDelay: ReturnType<typeof setTimeout> | null = null
    const startPolling = () => {
        if (pollTimer) return
        pollTimer = setInterval(async () => {
            try {
                const fresh = await fetchOrder()
                if (!fresh?.myOrder || disposed) return
                const current = dataOrder.value?.myOrder
                if (!current
                    || fresh.myOrder.status !== current.status
                    || fresh.myOrder.payment?.status !== current.payment?.status) {
                    mergeOrder(fresh.myOrder)
                }
                if (TERMINAL_STATUSES.includes(fresh.myOrder.status) && pollTimer) {
                    clearInterval(pollTimer)
                    pollTimer = null
                }
            } catch { /* Polling errors are non-critical */ }
        }, FALLBACK_POLL_MS)
    }

    onMounted(() => {
        cartStore.setCartVisibility(false)
        pollDelay = setTimeout(startPolling, FALLBACK_POLL_MS)
    })

    onScopeDispose(() => {
        disposed = true
        if (pollDelay) clearTimeout(pollDelay)
        if (pollTimer) clearInterval(pollTimer)
        timers.forEach(clearTimeout)
        timers.clear()
    })

    return {
        order,
        orderError,
        phase,
        paymentOutcome,
        paymentProblem,
        resolvingPayment,
        liveUpdate,
        refresh,
    }
}
