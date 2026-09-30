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
            'inline-flex items-center justify-center gap-2 rounded-xl text-center font-semibold select-none transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            SIZES[size],
            VARIANTS[variant],
            block ? 'w-full' : '',
            inactive ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.97]',
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
 * The one call-to-action button. Colors come from the brand tokens
 * (--primary, --primary-hover, --primary-soft, --ring in the app's brand.css),
 * so each brand app inherits its own accent. Renders a locale-aware link when
 * `to` is set, a plain anchor when `href` is set, a <button> otherwise.
 */
const SIZES = {
    sm: 'min-h-9 px-3 text-xs',
    md: 'min-h-11 px-5 py-2 text-sm',
    lg: 'min-h-12 px-6 py-3 text-sm',
} as const

const VARIANTS = {
    primary: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover',
    secondary: 'border border-gray-200 bg-white text-gray-700 hover:bg-primary-soft/40',
    ghost: 'text-gray-700 hover:bg-gray-100',
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
