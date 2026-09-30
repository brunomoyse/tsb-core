<template>
    <component
        :is="tag"
        :to="to"
        :href="href"
        :type="tag === 'button' ? type : undefined"
        :disabled="tag === 'button' ? inactive : undefined"
        :aria-disabled="tag !== 'button' && inactive ? 'true' : undefined"
        :tabindex="tag !== 'button' && inactive ? -1 : undefined"
        :aria-busy="loading || undefined"
        :class="[
            'btn focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            VARIANTS[variant],
            SIZES[size],
            block ? 'w-full' : '',
            inactive && tag !== 'button' ? 'pointer-events-none' : '',
        ]"
    >
        <svg v-if="loading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <slot />
    </component>
</template>

<script lang="ts" setup>
import { computed, resolveComponent } from 'vue'

/*
 * The one call-to-action button. It only emits the `.btn` vocabulary; each
 * brand app styles those classes (shape, size, accent) in its own CSS, so
 * the same markup renders as that brand's button. Renders a locale-aware
 * link when `to` is set, a plain anchor when `href` is set, a <button>
 * otherwise.
 */
const SIZES = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
} as const

const VARIANTS = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
} as const

const {
    variant = 'primary',
    size = 'md',
    type = 'button',
    to,
    href,
    block = false,
    loading = false,
    disabled = false,
} = defineProps<{
    variant?: keyof typeof VARIANTS
    size?: keyof typeof SIZES
    type?: 'button' | 'submit' | 'reset'
    to?: string
    href?: string
    block?: boolean
    loading?: boolean
    disabled?: boolean
}>()

const inactive = computed(() => disabled || loading)
const tag = computed(() => {
    if (to) return resolveComponent('NuxtLinkLocale')
    return href ? 'a' : 'button'
})
</script>
