import { type MaybeRefOrGetter, computed, toValue, watch } from 'vue'
import type { Order } from '#engine/types'
import { toCamelCase } from '#engine/utils/utils'
import { useAnnouncer } from '#engine/composables/useAnnouncer'
import { useI18n } from 'vue-i18n'

const DELIVERY_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'AWAITING_PICK_UP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
]
const PICKUP_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'AWAITING_PICK_UP', 'PICKED_UP']

export type TimelineStepState = 'done' | 'current' | 'upcoming'

export interface TimelineStep {
  status: string
  title: string
  state: TimelineStepState
  /** Screen-reader-only suffix: "completed" / "upcoming" for the steps that are not the current one (the current one gets aria-current="step"). */
  srSuffix: string
}

/*
 * The steps of an order's status timeline and what each one is (audit PR 3.6, A7): the template renders them as an
 * ordered list, marks the current step with aria-current="step" and says "completed" / "upcoming" in text for the
 * rest, so the state is no longer carried by the colour of a dot alone.
 *
 * A status that CHANGES while the page is open (the live subscription) is announced politely; the first value
 * (the page loading) is not, which is why this is a plain watch and not an immediate one.
 */
export function useOrderStatusTimeline(order: MaybeRefOrGetter<Order>) {
  const { t } = useI18n()
  const { announce } = useAnnouncer()

  const statuses = computed(() =>
    toValue(order).type === 'DELIVERY' ? DELIVERY_STATUSES : PICKUP_STATUSES,
  )
  const currentIndex = computed(() => statuses.value.indexOf(toValue(order).status))
  const completed = computed(() => ['DELIVERED', 'PICKED_UP'].includes(toValue(order).status))

  const titleOf = (status: string): string =>
    t(
      DETAILED_STATUSES.has(status)
        ? `me.orders.status.details.title.${toCamelCase(status)}`
        : `me.orders.status.${toCamelCase(status)}`,
    )

  // A finished order has no "current" step: every step, the outcome included, reads as done.
  const steps = computed<TimelineStep[]>(() =>
    statuses.value.map((status, index) => {
      const state: TimelineStepState = completed.value
        ? 'done'
        : index === currentIndex.value
          ? 'current'
          : index < currentIndex.value
            ? 'done'
            : 'upcoming'
      return {
        status,
        title: titleOf(status),
        state,
        srSuffix:
          state === 'done'
            ? t('orderStatus.completed')
            : state === 'upcoming'
              ? t('orderStatus.upcoming')
              : '',
      }
    }),
  )

  watch(
    () => toValue(order).status,
    (next, previous) => {
      if (next === previous || !next) return
      announce(t('orderStatus.changed', { status: titleOf(next) }))
    },
  )

  return { steps }
}

// The statuses that have a dedicated customer-facing title (`me.orders.status.details.title.*`); the others fall back to the plain status label.
const DETAILED_STATUSES = new Set([
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'AWAITING_PICK_UP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'PICKED_UP',
])
