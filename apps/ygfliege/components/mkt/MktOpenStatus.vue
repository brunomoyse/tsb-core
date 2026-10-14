<template>
  <!-- Rendered once mounted: it depends on the visitor's clock (the server's would not match the hydrated minute). -->
  <div v-if="variant === 'pill'" class="min-h-9">
    <p
      v-if="view"
      data-testid="open-status"
      class="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 rounded-ygf-btn bg-white px-4 py-1.5 text-sm shadow-ygf-md"
    >
      <span class="status-dot" :class="{ 'is-open': view.open }" aria-hidden="true" />
      <strong class="text-ygf-black">{{ $t(view.labelKey) }}</strong>
      <span v-if="view.sub" class="text-ygf-gray-600"
        >· {{ $t(view.sub.key, view.sub.values) }}</span
      >
    </p>
  </div>

  <div v-else data-testid="open-status-card" class="min-h-[5.5rem]">
    <template v-if="view">
      <p class="flex flex-wrap items-center gap-x-2.5 text-[1.0625rem]">
        <span class="status-dot" :class="{ 'is-open': view.open }" aria-hidden="true" />
        <strong class="text-ygf-black">{{ $t(view.labelKey) }}</strong>
        <span v-if="view.sub" class="text-sm text-ygf-gray-600">{{
          $t(view.sub.key, view.sub.values)
        }}</span>
      </p>
      <!-- How far into today's hours (empty while closed) -->
      <div
        class="mt-3 mb-1.5 h-1.5 rounded-full bg-ygf-orange/15 overflow-hidden"
        role="presentation"
      >
        <div
          class="h-full rounded-full bg-ygf"
          :style="{ width: `${state?.kind === 'open' ? Math.round(state.progress * 100) : 0}%` }"
        />
      </div>
    </template>
    <ul class="text-sm text-ygf-gray-600 space-y-0.5" data-testid="opening-hours">
      <li v-for="run in runs" :key="run.from" class="flex flex-wrap justify-between gap-x-3">
        <span>{{ runDays(run) }}</span>
        <span class="font-medium text-ygf-black tabular-nums">{{ runHours(run) }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
/*
 * The live "Ouvert · ferme à 22h00" status of the showcase pages (audit 1a/1b): a pill in the hero, a card with the
 * day bar and the week's hours (identical days collapsed into one line) in the practical info. The hours come from the
 * live restaurant config, else brand.openingHours; with the shop on and its config loaded, the shop's own state wins
 * (open: "prêt en ~30 min", pre-order time). Ticks every minute; nothing under reduced motion is animated but the dot.
 */
import {
  type HoursRun,
  type OpenState,
  type OrderingState,
  type WeekDay,
  WEEK,
  collapseHours,
  formatHm,
  openState,
  statusView,
} from '~/utils/openingHours'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { BrandOpeningHours } from '#engine/types/brand'
import { useOrderingAvailability } from '#engine/composables/useOrderingAvailability'
import { useShopEnabled } from '#engine/composables/useShopEnabled'

const { variant = 'pill' } = defineProps<{ variant?: 'pill' | 'card' }>()

const { t, locale } = useI18n()
const { brand } = useAppConfig()
const shopEnabled = useShopEnabled()
const {
  config,
  status: availability,
  preorderTime,
} = await useOrderingAvailability({
  lazy: true,
})

const live = computed(() => config.value?.restaurantConfig ?? null)
const hours = computed<BrandOpeningHours>(
  () => (live.value?.openingHours as BrandOpeningHours | undefined) ?? brand.openingHours ?? {},
)

const now = ref<Date | null>(null)
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  now.value = new Date()
  timer = setInterval(() => (now.value = new Date()), 60_000)
})
onBeforeUnmount(() => clearInterval(timer))

const state = computed<OpenState | null>(() =>
  now.value === null ? null : openState(hours.value, now.value),
)

const ordering = computed<OrderingState | null>(() => {
  if (!shopEnabled || availability.value === null || live.value === null) return null
  if (availability.value === 'open' || availability.value === 'preorder') return availability.value
  return live.value.isCurrentlyOpen ? 'onsiteOnly' : 'closed'
})

/** Monday 12 October 2026 + n: a weekday name in the page's language. */
const dayName = (day: WeekDay, style: 'long' | 'short' = 'long'): string =>
  new Intl.DateTimeFormat(locale.value, { weekday: style, timeZone: 'UTC' }).format(
    new Date(Date.UTC(2026, 9, 12 + WEEK.indexOf(day), 12)),
  )

const view = computed(() =>
  state.value === null
    ? null
    : statusView(state.value, {
        ordering: ordering.value,
        preparationMinutes: live.value?.preparationMinutes ?? null,
        preorderTime: preorderTime.value,
        time: (hm) => formatHm(hm, locale.value),
        day: (day) => dayName(day),
      }),
)

const runs = computed(() => collapseHours(hours.value))
const runDays = (run: HoursRun): string => {
  if (run.from === 'monday' && run.to === 'sunday') return t('mkt.status.everyDay')
  if (run.from === run.to) return dayName(run.from)
  return `${dayName(run.from, 'short')} - ${dayName(run.to, 'short')}`
}
const runHours = (run: HoursRun): string => {
  if (!run.hours) return t('mkt.status.closed')
  const span = (open: string, close: string) =>
    `${formatHm(open, locale.value)} - ${formatHm(close, locale.value)}`
  const lunch = span(run.hours.open, run.hours.close)
  return run.hours.dinnerOpen !== undefined && run.hours.dinnerClose !== undefined
    ? `${lunch}, ${span(run.hours.dinnerOpen, run.hours.dinnerClose)}`
    : lunch
}
</script>

<style scoped>
/* Orange dot (the brand keeps green for vegan only), a soft pulse while open. */
.status-dot {
  width: 0.625rem;
  height: 0.625rem;
  flex-shrink: 0;
  border-radius: 9999px;
  background: theme('colors.ygf.wood');
}

.status-dot.is-open {
  background: theme('colors.ygf.DEFAULT');
}

@media (prefers-reduced-motion: no-preference) {
  .status-dot.is-open {
    animation: ygf-status-pulse 2s ease-out infinite;
  }
}

@keyframes ygf-status-pulse {
  0% {
    box-shadow: 0 0 0 0 theme('colors.ygf.DEFAULT / 55%');
  }

  70% {
    box-shadow: 0 0 0 8px theme('colors.ygf.DEFAULT / 0%');
  }

  100% {
    box-shadow: 0 0 0 0 theme('colors.ygf.DEFAULT / 0%');
  }
}
</style>
