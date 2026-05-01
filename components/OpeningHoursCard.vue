<template>
    <div class="bg-tsb-two rounded-2xl p-6 sm:p-8 scroll-mt-6 h-full flex flex-col">
        <component :is="as" class="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-[15px]">
            <svg aria-hidden="true" class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            {{ $t('about.openingHoursLabel') }}
        </component>
        <dl class="space-y-3 text-sm text-gray-600">
            <div>
                <dt class="text-xs uppercase tracking-wide text-gray-700">{{ $t('contact.weekdays') }}</dt>
                <dd v-if="weekdaysHours" class="mt-0.5 text-gray-900 tabular-nums whitespace-nowrap">{{ weekdaysHours }}</dd>
                <dd v-else class="mt-0.5 h-4 w-40 max-w-full rounded animate-shimmer" style="background-size: 200% 100%; background-image: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);" aria-hidden="true" />
            </div>
            <div>
                <dt class="text-xs uppercase tracking-wide text-gray-700">{{ $t('contact.weekends') }}</dt>
                <dd v-if="weekendsHours" class="mt-0.5 text-gray-900 tabular-nums whitespace-nowrap">{{ weekendsHours }}</dd>
                <dd v-else class="mt-0.5 h-4 w-32 max-w-full rounded animate-shimmer" style="background-size: 200% 100%; background-image: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);" aria-hidden="true" />
            </div>
        </dl>
        <p class="text-red-700 text-xs pt-3">{{ $t('contact.closedTuesday') }}</p>
    </div>
</template>

<script setup lang="ts">
const { as = 'h3' } = defineProps<{
    as?: 'h2' | 'h3'
}>()

const { config: restaurantConfig } = await useRestaurantConfig({ lazy: true })

interface DaySchedule { open: string; close: string; dinnerOpen?: string; dinnerClose?: string }

const toFrTime = (hhmm: string) => {
    const [h, m] = hhmm.split(':')
    return m && m !== '00' ? `${Number(h)}h${m}` : `${Number(h)}h`
}
const formatDayHours = (day: DaySchedule | null | undefined) => {
    if (!day) return null
    const lunch = `${toFrTime(day.open)}-${toFrTime(day.close)}`
    if (day.dinnerOpen && day.dinnerClose) {
        return `${lunch} / ${toFrTime(day.dinnerOpen)}-${toFrTime(day.dinnerClose)}`
    }
    return lunch
}

const weekdaysHours = computed(() => formatDayHours(restaurantConfig.value?.restaurantConfig?.openingHours?.monday))
const weekendsHours = computed(() => formatDayHours(restaurantConfig.value?.restaurantConfig?.openingHours?.saturday))
</script>
