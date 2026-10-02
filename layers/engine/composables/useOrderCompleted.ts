import { type PaymentOutcome, isPaymentProblem, outcomeFromPaymentStatus } from '#engine/lib/paymentOutcome'
import { computed, onMounted, onScopeDispose, ref, watch } from 'vue'
import { useAsyncData, useCartStore, useGqlSubscription, useNuxtApp } from '#imports'
import { ORDER_ITEMS_SELECTION } from '#engine/lib/orderDocuments'
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
 *   awaiting-confirmation  still pending after the verify window → neutral "we have not
 *             received the confirmation yet, do not pay again" card, cart kept, keeps updating
 *   problem   canceled / failed / expired, or an open payment on an already
 *             cancelled/failed order                       → retry screen, cart kept
 *   confirmed paid online order, or any cash order       → celebration, cart cleared
 *
 * The cart is committed (cleared) ONLY in the `confirmed` phase, and only when it is the cart
 * checked out for this very order (`cart.pendingOrderId`). Mirrors
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
            transactionFee
            totalPrice
            couponCode
            cashPaymentAmount
            estimatedReadyTime
            addressExtra
            orderNote
            orderExtra
            cancellationReason

            address {
                streetName
                houseNumber
                boxNumber
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
            ${ORDER_ITEMS_SELECTION}
        }
    }
`)

export type OrderCompletedPhase = 'loading' | 'error' | 'verifying' | 'awaiting-confirmation' | 'problem' | 'confirmed'

/** Gaps between status checks while an online order is still open/pending (≈17 s in total). */
const VERIFY_DELAYS_MS = [800, 1200, 1500, 2000, 3000, 4000, 5000]
/** Safety-net poll for when the WebSocket subscription fails silently. */
const FALLBACK_POLL_MS = 15_000
/*
 * TODO(remove after 2026-11-15): transitional fallback for customers whose checkout ran on the
 * PREVIOUS web bundle. That bundle never stored `pendingOrderId`, so they come back from Mollie
 * with `pendingOrderId === null` and would keep a full cart for an order that is already placed
 * (and could place it twice). For a short window we therefore also commit a cart with no
 * `pendingOrderId` when the order was created minutes ago. A cart checked out for a DIFFERENT
 * order (non-null id) is never touched. By the date above every cart in the wild has been written
 * by a bundle that sets the id: delete this window and the `createdAt` source of the watch below.
 */
const TRANSITIONAL_CHECKOUT_WINDOW_MS = 30 * 60 * 1000
const isTransitionalCheckout = (pendingOrderId: string | null | undefined, createdAt: string | null | undefined): boolean => {
    if (typeof pendingOrderId === 'string' || !createdAt) return false
    const age = Date.now() - Date.parse(createdAt)
    return Number.isFinite(age) && age >= 0 && age < TRANSITIONAL_CHECKOUT_WINDOW_MS
}
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

    // Set once the verify loop gave up: the order is still pending and the webhook is late.
    const verifyExpired = ref(false)

    const phase = computed<OrderCompletedPhase>(() => {
        const o = order.value
        if (!o) return orderError.value ? 'error' : 'loading'
        const out = paymentOutcome.value
        if (out === null) return 'confirmed'
        /* Still PENDING with an open/unknown payment: only a late webhook explains it, so after the
           verify window show a neutral "awaiting confirmation" state, NEVER the retry screen (a
           second payment would double-charge a customer whose first one is just not confirmed yet).
           The retry screen needs a definitive verdict: canceled/failed/expired, or an order that
           is already CANCELLED/FAILED. */
        if (out === 'abandoned' && o.status === 'PENDING') return verifyExpired.value ? 'awaiting-confirmation' : 'verifying'
        return isPaymentProblem(out) ? 'problem' : 'confirmed'
    })

    const paymentProblem = computed(() => phase.value === 'problem')
    const awaitingConfirmation = computed(() => phase.value === 'awaiting-confirmation')
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
       while still loading/verifying/errored, so "Try again" keeps the cart.
       And only the cart that was checked out for THIS order (the checkout stores
       its id in `pendingOrderId`): revisiting an old confirmation later (history,
       an email link) must not wipe whatever the customer has in the cart by then.
       The pending id also gates a late persisted-state hydration, hence the watch on it. */
    let committed = false
    watch([phase, () => cartStore.pendingOrderId, () => order.value?.createdAt], ([p, pendingOrderId, createdAt]) => {
        if (p !== 'confirmed' || committed || !import.meta.client) return
        if (pendingOrderId !== orderId && !isTransitionalCheckout(pendingOrderId, createdAt)) return
        committed = true
        cartStore.resetState()
    }, { immediate: true })

    /* ── Verify loop ──
       Returned from Mollie before the webhook landed: re-check the status a few
       times before deciding. Stops as soon as the phase leaves `verifying`
       (subscription/poll update, unmount). If it is still pending when it runs
       out, fall through to the neutral "awaiting confirmation" state (never the retry screen:
       the webhook may just be late) — the cart is kept and live updates keep running. */
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
        awaitingConfirmation,
        resolvingPayment,
        liveUpdate,
        refresh,
    }
}
