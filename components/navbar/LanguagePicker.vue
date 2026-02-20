<template>
    <li class="relative">
        <!-- Language Icon Button -->
        <div class="relative group w-[50px] h-[50px] bg-white flex items-center justify-center rounded-full hover:shadow-md transition-shadow overflow-visible cursor-pointer"
             @click="toggleDropdown">
            <img :alt="alt" :src="icon" class="h-6 w-6"/>
            <span
                class="absolute left-1/2 top-full -translate-x-1/2 mt-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50 min-w-max">
                {{ tooltipText }}
            </span>
        </div>
        <!-- Dropdown Menu: appears to the right of the icon -->
        <ul v-if="showDropdown"
            class="absolute left-full bottom-0 ml-2 bg-white border border-gray-200 rounded shadow-lg z-50 min-w-max">
            <li v-for="loc in localesToPick" :key="loc.code" class="whitespace-nowrap">
                <NuxtLink :to="switchLocalePath(loc.code)" class="block px-4 py-2 hover:bg-gray-100"
                          @click="hideDropdown(loc.code)">
                    {{ loc.label }}
                </NuxtLink>
            </li>
        </ul>
    </li>
</template>

<script lang="ts" setup>
import {computed, ref} from 'vue'
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

interface LanguagePickerProps {
    icon: string
    alt: string
    tooltipText: string
}

defineProps<LanguagePickerProps>()
</script>
