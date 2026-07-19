<template>
    <li ref="rootRef" class="relative">
        <!-- Language Icon Button -->
        <button type="button" data-testid="language-picker" class="min-h-11 min-w-11 w-11 h-11 bg-white border border-ygf-orange-100 flex items-center justify-center rounded-full hover:bg-ygf-orange-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ygf-orange focus-visible:ring-offset-2"
              :aria-expanded="showDropdown"
              :aria-label="tooltipText"
              aria-haspopup="listbox"
              @click.stop="toggleDropdown"
              @keydown.escape="hideDropdown()">
            <img :alt="alt" :src="icon" class="h-5 w-5"/>
        </button>
        <!-- Opens below and right-aligned. It used to fly out sideways
             (`left-full`), which suited the old vertical side rail but would
             overflow the viewport from a horizontal header. -->
        <ul v-if="showDropdown"
            ref="dropdownRef"
            role="listbox"
            class="absolute right-0 top-full mt-2 bg-white border border-ygf-orange-100 rounded-ygf-card shadow-ygf-md z-50 min-w-max overflow-hidden"
            @keydown.escape="hideDropdown()"
            @keydown.arrow-down.prevent="focusNext"
            @keydown.arrow-up.prevent="focusPrev">
            <li v-for="loc in localesToPick" :key="loc.code" role="option" class="whitespace-nowrap">
                <NuxtLink :to="switchLocalePath(loc.code)" :data-testid="'language-option-' + loc.code"
                          class="flex min-h-11 items-center px-4 py-2 text-ygf-black hover:bg-ygf-orange-50 transition-colors"
                          @click="hideDropdown(loc.code)">
                    {{ loc.label }}
                </NuxtLink>
            </li>
        </ul>
    </li>
</template>

<script lang="ts" setup>
import {computed, onMounted, onUnmounted, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {useSwitchLocalePath} from '#i18n'
import {useTracking} from '#engine/composables/useTracking'

const {locale, availableLocales} = useI18n()
const switchLocalePath = useSwitchLocalePath()
const { trackEvent } = useTracking()

const codeAvailables = computed(() => availableLocales.filter((code) => code !== locale.value))

const languages = [
    {code: 'fr', label: 'Français'},
    {code: 'en', label: 'English'},
    {code: 'nl', label: 'Nederlands'},
    {code: 'zh', label: '中文'}
]

const localesToPick = computed(() => languages.filter((lang) => codeAvailables.value.includes(lang.code)))

const showDropdown = ref(false);
const rootRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)

// Toggle the dropdown visibility
const toggleDropdown = () => {
    showDropdown.value = !showDropdown.value
};

const hideDropdown = (toLocale?: string) => {
    showDropdown.value = false
    if (toLocale) {
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

interface LanguagePickerProps {
    icon: string
    alt: string
    tooltipText: string
}

const { icon, alt, tooltipText } = defineProps<LanguagePickerProps>()
</script>
