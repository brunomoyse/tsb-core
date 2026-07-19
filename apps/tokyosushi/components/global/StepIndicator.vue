<template>
    <ol
        :aria-label="ariaLabel"
        class="flex items-center justify-center gap-2"
        role="list"
    >
        <li
            v-for="(label, index) in displayLabels"
            :key="index"
            :aria-current="index === current ? 'step' : undefined"
            class="flex items-center gap-2"
        >
            <span
                :class="[
                    'h-1.5 rounded-full transition-all duration-300',
                    index === current
                        ? 'w-8 bg-red-500'
                        : index < current
                            ? 'w-4 bg-red-300'
                            : 'w-4 bg-gray-200'
                ]"
            />
            <span class="sr-only">{{ label || `Step ${index + 1}` }}</span>
        </li>
    </ol>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

interface Props {
    /** Zero-indexed current step. */
    current: number
    /** Total number of steps. */
    total: number
    /** Optional per-step labels for screen readers. */
    labels?: string[]
    /** Outer aria-label for the whole list (e.g. "Sign-in progress"). */
    ariaLabel?: string
}

const { total, labels = [] } = defineProps<Props>()

const displayLabels = computed(() =>
    Array.from({ length: total }, (_, i) => labels[i] || ''),
)
</script>
