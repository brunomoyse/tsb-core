<template>
    <div class="inline-flex items-center justify-between gap-2">
        <button
            type="button"
            :data-testid="decTestid"
            :aria-label="$t('cart.decreaseQty')"
            :disabled="decDisabled"
            :class="[BUTTON, SIZES[size].button]"
            @click="emit('decrement')"
        >
            <svg :class="SIZES[size].icon" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
                <path d="M200-440v-80h560v80H200Z"/>
            </svg>
        </button>
        <span
            :data-testid="valueTestid"
            class="min-w-6 text-center text-sm font-semibold tabular-nums text-primary-hover"
            :class="{ 'animate-number-bounce': bounce }"
        >{{ value }}</span>
        <button
            type="button"
            :data-testid="incTestid"
            :aria-label="$t('cart.increaseQty')"
            :disabled="incDisabled"
            :class="[BUTTON, SIZES[size].button]"
            @click="emit('increment')"
        >
            <svg :class="SIZES[size].icon" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
                <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/>
            </svg>
        </button>
    </div>
</template>

<script lang="ts" setup>
// Single -/+ control for the product card, the cart and the product modal.
const BUTTON = 'flex shrink-0 items-center justify-center border border-gray-200 bg-white text-gray-600 transition-all duration-300 ease-out hover:border-primary/30 hover:bg-primary-soft hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-white disabled:hover:text-gray-600'

const SIZES = {
    sm: { button: 'h-9 w-9 rounded-lg', icon: 'h-4 w-4' },
    md: { button: 'h-10 w-10 rounded-xl', icon: 'h-5 w-5' },
} as const

const { value, size = 'md', decDisabled = false, incDisabled = false, bounce = false } = defineProps<{
    value: number
    size?: keyof typeof SIZES
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
</script>
