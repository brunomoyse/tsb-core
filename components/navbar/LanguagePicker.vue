<template>
    <li ref="rootRef" class="relative">
        <!-- Language Icon Button -->
        <button type="button" class="relative group w-[50px] h-[50px] bg-white flex items-center justify-center rounded-full hover:shadow-md transition-shadow overflow-visible cursor-pointer"
             :aria-expanded="showDropdown"
             aria-haspopup="listbox"
             @click.stop="toggleDropdown"
             @keydown.escape="hideDropdown()">
            <img :alt="alt" :src="icon" class="h-6 w-6"/>
            <span
                class="absolute left-1/2 top-full -translate-x-1/2 mt-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50 min-w-max">
                {{ tooltipText }}
            </span>
        </button>
        <!-- Dropdown Menu: appears to the right of the icon -->
        <ul v-if="showDropdown"
            ref="dropdownRef"
            role="listbox"
            class="absolute left-full bottom-0 ml-2 bg-white border border-gray-200 rounded shadow-lg z-50 min-w-max"
            @keydown.escape="hideDropdown()"
            @keydown.arrow-down.prevent="focusNext"
            @keydown.arrow-up.prevent="focusPrev">
            <li v-for="loc in localesToPick" :key="loc.code" role="option" class="whitespace-nowrap">
                <NuxtLink :to="switchLocalePath(loc.code)" class="block px-4 py-2 hover:bg-gray-100"
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
import {useTracking} from '~/composables/useTracking'

const {locale, availableLocales} = useI18n()
const switchLocalePath = useSwitchLocalePath()
const { trackEvent } = useTracking()

const codeAvailables = computed(() => availableLocales.filter((code) => code !== locale.value))

const languages = [
    {code: 'fr', label: '🇫🇷 Français'},
    {code: 'en', label: '🇬🇧 English'},
    {code: 'nl', label: '🇳🇱 Nederlands'},
    {code: 'zh', label: '🇨🇳 中文'}
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
