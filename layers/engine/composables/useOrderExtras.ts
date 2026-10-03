import { computed, watch } from 'vue'
import { defaultOrderExtra, useCartStore } from '#engine/stores/cart'
import type { OrderExtraConfig } from '#engine/types/brand'
import { brand } from '#brand/brand'

/**
 * Checkout extras (chopsticks, cutlery, wasabi, ginger, soy sauce) driven by `brand.orderExtras`:
 * which extras a brand offers, which are pre-selected, and which are unavailable for the
 * current cart. Shared by checkout.vue and CheckoutPaymentExtras.vue in every app.
 */
export function useOrderExtras() {
  const cartStore = useCartStore()
  const offered: OrderExtraConfig[] = brand.orderExtras
  const configOf = (name: string) => offered.find((extra) => extra.name === name)
  const isOffered = (name: string) => configOf(name) !== undefined

  // Names of the extras unavailable because every item in the cart is in their restricted categories.
  const lockedKey = computed(() => {
    const items = cartStore.products
    if (items.length === 0) return ''
    return offered
      .filter(
        (extra) =>
          extra.unavailableWhenCartOnlyIn?.length &&
          items.every((item) =>
            extra.unavailableWhenCartOnlyIn!.includes(item.product.category?.slug ?? ''),
          ),
      )
      .map((extra) => extra.name)
      .join(',')
  })
  const lockedNames = (key: string) => new Set(key ? key.split(',') : [])
  const isLocked = (name: string) => lockedNames(lockedKey.value).has(name)

  const entries = () => {
    if (!cartStore.orderExtra) cartStore.orderExtra = []
    return cartStore.orderExtra
  }
  const removeExtra = (name: string) => {
    const idx = entries().findIndex((entry) => entry.name === name)
    if (idx !== -1) entries().splice(idx, 1)
  }
  const addDefaultExtra = (extra: OrderExtraConfig) => {
    if (!entries().some((entry) => entry.name === extra.name))
      entries().push(defaultOrderExtra(extra))
  }

  /**
   * Run when checkout opens. Drops entries the brand doesn't offer, and re-syncs the
   * category-restricted extras with the cart: cleared when locked, pre-ticked otherwise.
   * Extras without a restriction (chopsticks) keep whatever the customer chose.
   */
  function applyDefaults() {
    const names = new Set(offered.map((extra) => extra.name))
    cartStore.orderExtra = entries().filter((entry) => names.has(entry.name))

    const locked = lockedNames(lockedKey.value)
    for (const extra of offered) {
      if (!extra.unavailableWhenCartOnlyIn?.length) continue
      if (locked.has(extra.name)) removeExtra(extra.name)
      else if (extra.preselected) addDefaultExtra(extra)
    }
  }

  /**
   * Keep the ticked extras in step with the lock while the cart changes on the checkout page:
   * becoming locked clears the extra, unlocking a non-empty cart restores the pre-selected default.
   */
  function syncLockedExtras() {
    watch(
      lockedKey,
      (key, previousKey) => {
        const locked = lockedNames(key)
        const wasLocked = lockedNames(previousKey ?? '')
        for (const extra of offered) {
          if (locked.has(extra.name)) removeExtra(extra.name)
          else if (wasLocked.has(extra.name) && cartStore.products.length > 0 && extra.preselected)
            addDefaultExtra(extra)
        }
      },
      { immediate: true },
    )
  }

  // Two-way boolean binding against cartStore.orderExtra by name.
  const useExtraToggle = (name: string) =>
    computed({
      get: () => cartStore.orderExtra?.some((entry) => entry.name === name) ?? false,
      set: (value: boolean) => {
        const present = entries().some((entry) => entry.name === name)
        if (value && !present) entries().push({ name })
        else if (!value) removeExtra(name)
      },
    })

  // Soy sauce: the selected option, or 'none' when it isn't ticked.
  const sauceConfig = configOf('sauce')
  const sauce = computed<string>({
    get() {
      const entry = cartStore.orderExtra?.find((e) => e.name === 'sauce')
      return entry?.options?.[0] ?? 'none'
    },
    set(value: string) {
      if (value === 'none') {
        removeExtra('sauce')
        return
      }
      const entry = entries().find((e) => e.name === 'sauce')
      if (entry) entry.options = [value]
      else entries().push({ name: 'sauce', options: [value] })
    },
  })
  const addSauce = computed({
    get: () => sauce.value !== 'none',
    set: (value: boolean) => {
      const pre = sauceConfig ? defaultOrderExtra(sauceConfig).options?.[0] : undefined
      sauce.value = value && pre ? pre : 'none'
    },
  })

  return {
    hasOfferedExtras: offered.length > 0,
    isOffered,
    isLocked,
    applyDefaults,
    syncLockedExtras,
    sauceOptions: sauceConfig?.options ?? [],
    addChopsticks: useExtraToggle('chopsticks'),
    addCutlery: useExtraToggle('cutlery'),
    addWasabi: useExtraToggle('wasabi'),
    addGinger: useExtraToggle('ginger'),
    addSauce,
    sauce,
  }
}
