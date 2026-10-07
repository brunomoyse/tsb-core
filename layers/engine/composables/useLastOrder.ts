import { computed, watch } from 'vue'
import { useNuxtApp, useState } from '#imports'
import { ORDER_ITEMS_SELECTION } from '#engine/lib/orderDocuments'
import type { Order } from '#engine/types'
import { pickReorderableOrder } from '#engine/utils/lastOrder'
import { reportError } from '#engine/utils/reportError'
import { useAuthStore } from '#engine/stores/auth'

/*
 * The signed-in customer's last order that can be ordered again, for the "your last order" bar
 * (components/cart/ReorderBar.vue). Client only: the session lives in the browser.
 *
 * The orders are loaded once per signed-in customer and kept in `useState`, so going from the home page to the menu
 * does not ask again; signing out forgets them. A failed load shows nothing (the bar is a shortcut, never in the way)
 * and is reported. Closing the bar hides that order for good on this device: a newer order brings it back.
 */

export type LastOrder = Pick<Order, 'id' | 'createdAt' | 'status' | 'totalPrice' | 'items'>

const LAST_ORDERS = /* GraphQL */ `
  query LastOrders {
    myOrders(first: 5) {
      id
      createdAt
      status
      totalPrice
      ${ORDER_ITEMS_SELECTION}
    }
  }
`

const DISMISSED_KEY = 'tsb:reorder-bar-dismissed'

const readDismissed = (): string | null => {
  try {
    return globalThis.localStorage.getItem(DISMISSED_KEY)
  } catch {
    return null
  }
}

const writeDismissed = (orderId: string): void => {
  try {
    globalThis.localStorage.setItem(DISMISSED_KEY, orderId)
  } catch {
    // Storage blocked (private mode): the bar only stays closed until the page is reloaded.
  }
}

interface LoadedOrders {
  userId: string
  order: LastOrder | null
}

export function useLastOrder() {
  const authStore = useAuthStore()
  const { $gqlFetch } = useNuxtApp()
  const loaded = useState<LoadedOrders | null>('last-order', () => null)
  const dismissedId = useState<string | null>('last-order-dismissed', readDismissed)

  const load = async (userId: string): Promise<void> => {
    try {
      const data = await $gqlFetch<{ myOrders: LastOrder[] }>(LAST_ORDERS)
      // Signed out (or another account) while the request was out: the answer is someone else's.
      if (authStore.user?.id !== userId) return
      loaded.value = { userId, order: pickReorderableOrder(data.myOrders) }
    } catch (error) {
      reportError(error, 'useLastOrder.load')
    }
  }

  watch(
    () => authStore.user?.id,
    (userId) => {
      if (userId === undefined) {
        loaded.value = null
        return
      }
      if (loaded.value?.userId !== userId) void load(userId)
    },
    { immediate: true },
  )

  const order = computed<LastOrder | null>(() => {
    const last = loaded.value?.order ?? null
    return last !== null && last.id !== dismissedId.value ? last : null
  })

  const dismiss = (): void => {
    const last = loaded.value?.order
    if (!last) return
    dismissedId.value = last.id
    writeDismissed(last.id)
  }

  return { order, dismiss }
}
