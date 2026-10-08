import { computed, watch, type ComputedRef } from 'vue'
import { useNuxtApp, useState } from '#imports'
import type { ProductOrderCount } from '#engine/utils/menuPicks'
import { reportError } from '#engine/utils/reportError'
import { useAuthStore } from '#engine/stores/auth'
import { useGqlQuery } from './useGqlQuery'

/*
 * What the row at the top of the menu is made of (utils/menuPicks.ts decides what it shows):
 *
 *   - `popular`, the most ordered products, the same for every visitor: asked with the page, so the row is in the
 *     server's HTML and nothing moves when the page hydrates.
 *   - `mine`, the signed-in customer's own products: client only (the session lives in the browser), loaded once per
 *     customer and kept in `useState`, forgotten on sign-out. Null until loaded; the row shows the popular products
 *     meanwhile, then switches in place.
 *
 * A failed load of either shows less (the row is a shortcut, never in the way) and is reported.
 */

const POPULAR_PRODUCTS = /* GraphQL */ `
  query PopularProducts {
    popularProducts {
      productId
      orderCount
    }
  }
`

const MY_ORDERED_PRODUCTS = /* GraphQL */ `
  query MyOrderedProducts {
    myOrderedProducts {
      productId
      orderCount
    }
  }
`

interface LoadedCounts {
  userId: string
  counts: ProductOrderCount[]
}

export interface MenuPickCounts {
  mine: ComputedRef<ProductOrderCount[] | null>
  popular: ComputedRef<ProductOrderCount[]>
}

export async function useMenuPickCounts(): Promise<MenuPickCounts> {
  const authStore = useAuthStore()
  const { $gqlFetch } = useNuxtApp()
  const loaded = useState<LoadedCounts | null>('menu-picks-mine', () => null)

  const load = async (userId: string): Promise<void> => {
    try {
      const data = await $gqlFetch<{ myOrderedProducts: ProductOrderCount[] }>(MY_ORDERED_PRODUCTS)
      // Signed out (or another account) while the request was out: the answer is someone else's.
      if (authStore.user?.id !== userId) return
      loaded.value = { userId, counts: data.myOrderedProducts }
    } catch (error) {
      reportError(error, 'useMenuPickCounts.load')
    }
  }

  // On the server nobody is signed in (the session lives in the browser), so this only ever loads in the browser.
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

  const { data } = await useGqlQuery<{ popularProducts: ProductOrderCount[] }>(
    POPULAR_PRODUCTS,
    {},
    { immediate: true, cache: true },
  )

  return {
    mine: computed(() =>
      loaded.value !== null && loaded.value.userId === authStore.user?.id
        ? loaded.value.counts
        : null,
    ),
    popular: computed(() => data.value?.popularProducts ?? []),
  }
}
