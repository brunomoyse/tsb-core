import {
  type EffectScope,
  type Ref,
  computed,
  effectScope,
  getCurrentScope,
  nextTick,
  onScopeDispose,
  ref,
  watch,
} from 'vue'
import { useGqlSubscription, useRoute } from '#imports'
import type { Order } from '#engine/types'
import { scrollBehavior } from '#engine/utils/scrollBehavior'
import { useI18n } from 'vue-i18n'

/*
 * Live tracking for a list of orders (/me widget and /me/orders, both brands).
 *
 * The orders query is client-only (SSR has no OIDC token), so on a hard load —
 * every "follow your order" email link to /me?followOrder=<id> — the list is
 * still empty when setup and onMounted run. Nothing here reads the list once:
 * everything is derived from the (reactive) list through watchers, so it works
 * whether the orders are there at setup, arrive a moment later, or are
 * refetched.
 *
 *   - one subscription per ACTIVE order: subscribed when it appears/becomes
 *     active, dropped when it completes or disappears, all dropped on unmount
 *   - refetch when the WebSocket reconnects (events during the gap are lost)
 *   - polling fallback while any order is active, in case subscriptions fail
 *   - ?followOrder=<id>: expand + scroll to that order once it is in the list
 */

const COMPLETED_STATUSES = ['DELIVERED', 'PICKED_UP', 'CANCELLED', 'FAILED']
const SUCCESS_STATUSES = ['DELIVERED', 'PICKED_UP']
const FAILED_STATUSES = ['CANCELLED', 'FAILED']

const POLL_INTERVAL_MS = 30_000

export const isOrderCompleted = (status: string): boolean => COMPLETED_STATUSES.includes(status)
export const isOrderSuccess = (status: string): boolean => SUCCESS_STATUSES.includes(status)
export const isOrderFailed = (status: string): boolean => FAILED_STATUSES.includes(status)

const SUB_ORDER_UPDATES = /* GraphQL */ `
  subscription ($orderId: ID!) {
    myOrderUpdated(orderId: $orderId) {
      id
      status
      updatedAt
      estimatedReadyTime
      cancellationReason
      payment {
        status
      }
    }
  }
`

interface UseOrderTrackingOptions {
  /** The orders as loaded by the query; null/undefined while not loaded yet. */
  orders: Readonly<Ref<Order[] | null | undefined>>
  /** Re-run the orders query (reconnect recovery + polling fallback). */
  refetch: () => unknown
  /** Expand active orders the first time they show up (the /me widget does). */
  autoExpandActive?: boolean
  /**
   * Called before a ?followOrder order is expanded, with its index in `orders`,
   * so a paginated list can make sure that order is rendered.
   */
  revealOrder?: (index: number) => void
}

export function useOrderTracking(options: UseOrderTrackingOptions) {
  const { t } = useI18n()
  const route = useRoute()
  // Child scopes (one per subscribed order) hang off the component's scope so unmount stops them.
  const parentScope = getCurrentScope()

  /* ── Live data, layered over the queried orders ── */
  const liveOrderData = ref<Record<string, Partial<Order>>>({})

  /* A live patch only applies while it is not older than the queried order:
       after a refetch the base can be newer than a stale subscription event. */
  const getTrackedOrder = (order: Order): Order => {
    const live = liveOrderData.value[order.id]
    if (!live) return order
    if (
      live.updatedAt &&
      order.updatedAt &&
      Date.parse(live.updatedAt) < Date.parse(order.updatedAt)
    )
      return order
    return { ...order, ...live }
  }

  const trackedOrders = computed<Order[] | null>(
    () => options.orders.value?.map(getTrackedOrder) ?? null,
  )
  const activeIds = computed(() =>
    (trackedOrders.value ?? []).filter((o) => !isOrderCompleted(o.status)).map((o) => o.id),
  )
  const hasActiveOrders = computed(() => activeIds.value.length > 0)

  /* ── Refetch (coalesced: N subscriptions reconnecting = one request) ── */
  let refetching: Promise<void> | null = null
  const refetchOnce = (): Promise<void> => {
    refetching ??= (async () => {
      try {
        await options.refetch()
      } catch {
        /* Non-critical */
      } finally {
        refetching = null
      }
    })()
    return refetching
  }

  /* ── Per-order subscriptions ── */
  const subscriptions = new Map<string, EffectScope>()

  const subscribeToOrder = (orderId: string) => {
    if (!import.meta.client || subscriptions.has(orderId)) return
    if (parentScope && !parentScope.active) return
    const scope = parentScope ? parentScope.run(() => effectScope()) : effectScope()
    if (!scope) return
    subscriptions.set(orderId, scope)
    // Inside the child scope so useGqlSubscription's onScopeDispose and the watcher die with it.
    scope.run(() => {
      const { data } = useGqlSubscription<{ myOrderUpdated: Partial<Order> }>(
        SUB_ORDER_UPDATES,
        { orderId },
        { onReconnect: refetchOnce },
      )
      watch(data, (val) => {
        if (val?.myOrderUpdated) {
          liveOrderData.value[orderId] = { ...liveOrderData.value[orderId], ...val.myOrderUpdated }
        }
      })
    })
  }

  const unsubscribeFromOrder = (orderId: string) => {
    subscriptions.get(orderId)?.stop()
    subscriptions.delete(orderId)
  }

  /* ── Expand / collapse ── */
  const expandedOrders = ref(new Set<string>())
  const toggleOrder = (orderId: string) => {
    if (expandedOrders.value.has(orderId)) expandedOrders.value.delete(orderId)
    else expandedOrders.value.add(orderId)
  }
  const isExpanded = (orderId: string) => expandedOrders.value.has(orderId)

  // Remembered so a user who collapses an active order doesn't get it re-opened.
  const autoExpanded = new Set<string>()

  // Keep subscriptions in step with the active set. immediate: orders may already be there at setup.
  watch(
    activeIds,
    (ids) => {
      const wanted = new Set(ids)
      ids.forEach(subscribeToOrder)
      for (const id of Array.from(subscriptions.keys())) {
        if (!wanted.has(id)) unsubscribeFromOrder(id)
      }
      if (options.autoExpandActive) {
        for (const id of ids) {
          if (autoExpanded.has(id)) continue
          autoExpanded.add(id)
          expandedOrders.value.add(id)
        }
      }
    },
    { immediate: true },
  )

  /* ── Polling fallback (WebSocket blocked/failing: mobile Safari, proxies…) ── */
  let pollTimer: ReturnType<typeof setInterval> | null = null
  watch(
    hasActiveOrders,
    (active) => {
      if (!import.meta.client) return
      if (active && !pollTimer) {
        pollTimer = setInterval(() => {
          if (document.hidden) return
          void refetchOnce()
        }, POLL_INTERVAL_MS)
      } else if (!active && pollTimer) {
        clearInterval(pollTimer)
        pollTimer = null
      }
    },
    { immediate: true },
  )

  /* ── ?followOrder=<id> ── */
  const followOrderId = computed(() => {
    const q = route.query.followOrder
    const id = Array.isArray(q) ? q[0] : q
    return typeof id === 'string' && id ? id : null
  })
  let followHandled: string | null = null
  watch(
    [trackedOrders, followOrderId],
    async ([list, id]) => {
      if (!list || !id || followHandled === id) return
      const index = list.findIndex((o) => o.id === id)
      if (index === -1) return // Not loaded (yet): the watcher re-runs when the list changes
      followHandled = id
      options.revealOrder?.(index)
      expandedOrders.value.add(id)
      if (!import.meta.client) return
      await nextTick()
      document.getElementById(`order-card-${id}`)?.scrollIntoView({
        behavior: scrollBehavior(),
        block: 'center',
      })
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    subscriptions.forEach((scope) => {
      scope.stop()
    })
    subscriptions.clear()
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  })

  /* ── Labels (colours stay per brand) ── */
  // A delivery has no counter pick-up step: for a delivery order the kitchen has finished (AWAITING_PICK_UP) the label is the "preparing" one, as in the status timeline.
  const getStatus = (status: string, type?: string): string => {
    const map: Record<string, string> = {
      PENDING: t('me.orders.status.pending'),
      CONFIRMED: t('me.orders.status.confirmed'),
      PREPARING: t('me.orders.status.preparing'),
      AWAITING_PICK_UP:
        type === 'DELIVERY'
          ? t('me.orders.status.preparing')
          : t('me.orders.status.awaitingPickup'),
      OUT_FOR_DELIVERY: t('me.orders.status.outForDelivery'),
      PICKED_UP: t('me.orders.status.pickedUp'),
      DELIVERED: t('me.orders.status.delivered'),
      CANCELLED: t('me.orders.status.cancelled'),
      FAILED: t('me.orders.status.failed'),
    }
    return map[status] || ''
  }

  return {
    trackedOrders,
    getTrackedOrder,
    expandedOrders,
    toggleOrder,
    isExpanded,
    getStatus,
    isOrderCompleted,
    isOrderSuccess,
    isOrderFailed,
  }
}
