<template>
    <div class="relative pl-4">
        <!-- Vertical line (decoration: kept out of the list, whose only children are its steps) -->
        <div class="absolute left-[3px] top-1.5 bottom-1.5 w-px bg-neutral-200" aria-hidden="true" />
        <ol role="list" :aria-label="$t('orderStatus.label')">
            <li
                v-for="(step, index) in steps"
                :key="step.status"
                class="relative flex items-center"
                :class="index > 0 ? 'mt-3.5' : ''"
                :aria-current="step.state === 'current' ? 'step' : undefined"
            >
                <!-- Dot -->
                <div class="absolute -left-4 top-1/2 -translate-y-1/2 flex items-center justify-center" aria-hidden="true">
                    <div
                        v-if="step.state === 'current'"
                        class="w-[7px] h-[7px] rounded-full bg-primary-600 text-primary-600 stone-ripple"
                    />
                    <div
                        v-else-if="step.state === 'done'"
                        class="w-[7px] h-[7px] rounded-full bg-emerald-500"
                    />
                    <div
                        v-else
                        class="w-[7px] h-[7px] rounded-full border border-neutral-300 bg-white"
                    />
                </div>

                <!-- Label -->
                <span
                    class="text-sm leading-tight"
                    :class="step.state === 'current'
                        ? 'font-semibold text-neutral-900'
                        : step.state === 'done'
                            ? 'text-neutral-600'
                            : 'text-neutral-600'"
                >
                    {{ step.title }}<span v-if="step.srSuffix" class="sr-only">, {{ step.srSuffix }}</span>
                </span>
            </li>
        </ol>
    </div>
</template>

<script lang="ts" setup>
import type { Order } from '#engine/types'
import { useOrderStatusTimeline } from '#engine/composables/useOrderStatusTimeline'

const { order } = defineProps<{ order: Order }>()

// The steps, their state and the polite announcement of a status change live in the engine, shared by both brands.
const { steps } = useOrderStatusTimeline(() => order)
</script>

<style scoped>
.stone-ripple {
    animation: ripple 2s ease-out infinite;
}

/* The ring follows the dot's colour (text-primary-600 sets currentColor): red on Tokyo Sushi, orange on YGF. */
@keyframes ripple {
    0% { box-shadow: 0 0 0 0 color-mix(in srgb, currentColor 35%, transparent); }
    70% { box-shadow: 0 0 0 5px transparent; }
    100% { box-shadow: 0 0 0 0 transparent; }
}

@media (prefers-reduced-motion: reduce) {
    .stone-ripple {
        animation: none;
        box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 15%, transparent);
    }
}
</style>
