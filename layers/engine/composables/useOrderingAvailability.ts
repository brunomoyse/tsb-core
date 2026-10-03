import { bookableSlots, canPlaceOrder, orderingStatus } from '#engine/utils/orderingAvailability'
import { computed, ref } from 'vue'
import { useIntervalFn } from '@vueuse/core'
import { useOrderingPolicy } from './useOrderingPolicy'
import { useRestaurantConfig } from './useRestaurantConfig'

/**
 * Everything the UI needs to know about "can I order right now?", from the restaurant config, in
 * one place (audit M6 + M7). Surfaces must NOT re-derive any of this from isOrderingCurrentlyOpen.
 *
 *  - isAvailable: ordering is enabled and either open or still bookable ahead today (the one gate
 *    for pay buttons, cart links, the post-login redirect). False until the config has loaded.
 *  - isClosed: the config HAS loaded and says nothing can be ordered. The only condition that may
 *    show a "closed" banner or a disabled "ordering unavailable" button: a config that is still
 *    loading, or failed to load, says nothing about opening hours.
 *  - isPreorderOnly / preorderTime: closed right now but a slot today can still be booked ("order now for 19:00").
 *  - isLoading / loadFailed: no config yet, with / without a failed request (retry with `retry`).
 */
export async function useOrderingAvailability(options: { lazy?: boolean; server?: boolean } = {}) {
  /*
   * Everything that needs the component instance is registered BEFORE the first await (see the
   * note in useRestaurantConfig): the clock only exists so a slot that falls inside the
   * preparation window stops counting on a stale config, without waiting for a refetch.
   */
  const nowMs = ref(Date.now())
  const { policy } = useOrderingPolicy()
  if (import.meta.client)
    useIntervalFn(() => {
      nowMs.value = Date.now()
    }, 30_000)

  const { config, pending, error, refresh } = await useRestaurantConfig(options)

  const current = computed(() => config.value?.restaurantConfig ?? null)
  const isLoaded = computed(() => current.value !== null)
  const loadFailed = computed(() => !isLoaded.value && !pending.value && Boolean(error.value))
  const isLoading = computed(() => !isLoaded.value && !loadFailed.value)

  const status = computed(() =>
    isLoaded.value ? orderingStatus(current.value, nowMs.value, policy.value) : null,
  )
  const isAvailable = computed(() => canPlaceOrder(current.value, nowMs.value, policy.value))
  const isClosed = computed(() => isLoaded.value && !isAvailable.value)
  const isPreorderOnly = computed(() => status.value === 'preorder')
  /** Ordering is switched off by the restaurant (the config says so, as opposed to not having a config). */
  const isOrderingDisabled = computed(() => status.value === 'disabled')
  /** "HH:MM" (restaurant time) of the first slot a pre-order can be booked for. */
  const firstSlotLabel = computed(
    () =>
      bookableSlots(
        current.value?.availableSlotsToday,
        { preparationMinutes: current.value?.preparationMinutes, nowMs: nowMs.value },
        policy.value,
      )[0]?.label ?? null,
  )
  /** The slot time to advertise ("order now for 19:00"), only while pre-ordering is what is on offer. */
  const preorderTime = computed(() => (isPreorderOnly.value ? firstSlotLabel.value : null))

  const retry = async (): Promise<void> => {
    await refresh()
  }

  return {
    config,
    refresh,
    retry,
    pending,
    error,
    isLoaded,
    isLoading,
    loadFailed,
    status,
    isAvailable,
    isClosed,
    isPreorderOnly,
    isOrderingDisabled,
    firstSlotLabel,
    preorderTime,
  }
}
