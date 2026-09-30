<template>
    <div ref="rootRef" class="relative">
        <!-- Trigger: always shows the language currently in use -->
        <button
            type="button"
            data-testid="language-picker"
            :class="variant === 'rail'
                ? 'relative group w-[50px] h-[50px] bg-white text-neutral-900 flex flex-col items-center justify-center gap-0.5 rounded-full hover:shadow-md transition-shadow overflow-visible cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                : 'inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-neutral-700 hover:bg-tsb-four/40 transition-colors duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'"
            :aria-expanded="showDropdown"
            :aria-label="`${$t('nav.language')} (${$t('nav.currentLanguage', { language: current.label })})`"
            aria-haspopup="listbox"
            @click.stop="toggleDropdown"
            @keydown.escape="hideDropdown()"
        >
            <NavIcon src="/icons/translate-icon.svg" :class="variant === 'rail' ? 'h-5 w-5' : 'h-5 w-5 text-neutral-500'" />
            <span v-if="variant === 'rail'" class="text-[10px] font-semibold leading-none">{{ current.short }}</span>
            <template v-else>
                <span>{{ current.label }}</span>
                <svg class="h-4 w-4 text-neutral-400 transition-transform duration-300" :class="{ 'rotate-180': showDropdown }" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19 9l-7 7-7-7" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </template>
            <!-- Tooltip positioned below, like the other rail items -->
            <span
                v-if="variant === 'rail' && !showDropdown"
                class="absolute left-1/2 top-full -translate-x-1/2 mt-2 px-2 py-1 bg-black text-white text-xs font-normal rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50 min-w-max pointer-events-none">
                {{ $t('nav.language') }}
            </span>
        </button>

        <!-- All languages, with a check on the active one -->
        <ul v-if="showDropdown"
            ref="dropdownRef"
            role="listbox"
            :aria-label="$t('nav.language')"
            :class="[
                'absolute bg-white border border-neutral-200 rounded-xl shadow-lg z-50 min-w-44 overflow-hidden py-1',
                PLACEMENTS[placement],
            ]"
            @keydown.escape="hideDropdown()"
            @keydown.arrow-down.prevent="focusNext"
            @keydown.arrow-up.prevent="focusPrev">
            <li v-for="lang in LANGUAGES" :key="lang.code" role="option" :aria-selected="lang.code === locale" class="whitespace-nowrap">
                <NuxtLink
                    :to="switchLocalePath(lang.code)"
                    :data-testid="'language-option-' + lang.code"
                    :lang="lang.code"
                    :class="[
                        'flex min-h-11 items-center justify-between gap-4 px-4 text-sm transition-colors duration-300 hover:bg-tsb-four/40 focus:outline-none focus-visible:bg-tsb-four/40',
                        lang.code === locale ? 'font-semibold text-primary-hover' : 'text-neutral-700',
                    ]"
                    @click="hideDropdown(lang.code)">
                    {{ lang.label }}
                    <svg v-if="lang.code === locale" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </NuxtLink>
            </li>
        </ul>
    </div>
</template>

<script lang="ts" setup>
import {computed, onMounted, onUnmounted, ref} from 'vue'
import NavIcon from './NavIcon.vue'
import {useI18n} from 'vue-i18n'
import {useSwitchLocalePath} from '#i18n'
import {useTracking} from '#engine/composables/useTracking'

const {locale} = useI18n()
const switchLocalePath = useSwitchLocalePath()
const { trackEvent } = useTracking()

// The one language list for every switcher (sidebar, mobile menu, login).
const LANGUAGES = [
    {code: 'fr', label: 'Français', short: 'FR'},
    {code: 'en', label: 'English', short: 'EN'},
    {code: 'nl', label: 'Nederlands', short: 'NL'},
    {code: 'zh', label: '中文', short: '中文'}
] as const

const PLACEMENTS = {
    right: 'left-full bottom-0 ml-2',
    'bottom-end': 'right-0 top-full mt-1',
    'top-center': 'left-1/2 -translate-x-1/2 bottom-full mb-1',
} as const

const { variant = 'inline', placement = 'bottom-end' } = defineProps<{
    /** `rail`: round icon button for the desktop sidebar. `inline`: labelled pill. */
    variant?: 'rail' | 'inline'
    placement?: keyof typeof PLACEMENTS
}>()

const current = computed(() => LANGUAGES.find((lang) => lang.code === locale.value) ?? LANGUAGES[0])

const showDropdown = ref(false);
const rootRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)

// Toggle the dropdown visibility
const toggleDropdown = () => {
    showDropdown.value = !showDropdown.value
};

const hideDropdown = (toLocale?: string) => {
    showDropdown.value = false
    if (toLocale && toLocale !== locale.value) {
        trackEvent('language_changed', { from_locale: locale.value, to_locale: toLocale })
    }
}

// Click outside handler
const onClickOutside = (e: MouseEvent) => {
    if (rootRef.value && !rootRef.value.contains(e.target as Node)) {
        showDropdown.value = false
    }
}

onMounted(() => {
    document.addEventListener('click', onClickOutside)
})

onUnmounted(() => {
    document.removeEventListener('click', onClickOutside)
})

// Keyboard navigation helpers
const focusNext = () => {
    if (!dropdownRef.value) return
    const items = Array.from(dropdownRef.value.querySelectorAll<HTMLElement>('a'))
    const idx = items.indexOf(document.activeElement as HTMLElement)
    const next = items[idx + 1] || items[0]
    next?.focus()
}

const focusPrev = () => {
    if (!dropdownRef.value) return
    const items = Array.from(dropdownRef.value.querySelectorAll<HTMLElement>('a'))
    const idx = items.indexOf(document.activeElement as HTMLElement)
    const prev = items[idx - 1] || items[items.length - 1]
    prev?.focus()
}
</script>
