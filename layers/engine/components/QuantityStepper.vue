<template>
    <div :class="['stepper', size === 'sm' ? 'stepper--sm' : '']">
        <button
            type="button"
            :data-testid="decTestid"
            :aria-label="$t('cart.decreaseQty')"
            :disabled="decDisabled"
            :class="BUTTON"
            @click="emit('decrement')"
        >
            <svg :class="ICON[size]" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
                <path d="M200-440v-80h560v80H200Z"/>
            </svg>
        </button>
        <span
            :data-testid="valueTestid"
            class="stepper-value"
            :class="{ 'animate-number-bounce': bounce }"
        >{{ value }}</span>
        <button
            ref="incButton"
            type="button"
            :data-testid="incTestid"
            :aria-label="$t('cart.increaseQty')"
            :disabled="incDisabled"
            :class="BUTTON"
            @click="emit('increment')"
        >
            <svg :class="ICON[size]" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
                <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/>
            </svg>
        </button>
    </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'

// Single -/+ control for the product card, the cart and the product modal.
// Emits the `.stepper` vocabulary; each brand app styles it in its own CSS.
const BUTTON = 'stepper-btn focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'

const ICON = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
} as const

const { value, size = 'md', decDisabled = false, incDisabled = false, bounce = false } = defineProps<{
    value: number
    size?: keyof typeof ICON
    decDisabled?: boolean
    incDisabled?: boolean
    bounce?: boolean
    decTestid?: string
    incTestid?: string
    valueTestid?: string
}>()

const emit = defineEmits<{
    decrement: []
    increment: []
}>()

// A parent that swaps its own control for this stepper hands focus to the "+" (the control that just replaced it).
const incButton = ref<HTMLButtonElement | null>(null)
defineExpose({ focusIncrement: () => incButton.value?.focus() })
</script>
