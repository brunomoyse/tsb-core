<template>
    <li ref="rootRef" class="relative" data-language-picker>
        <!-- Language icon button: a disclosure for the list of links below (audit A13) -->
        <button ref="buttonRef" type="button" data-testid="language-picker" class="min-h-11 min-w-11 w-11 h-11 bg-white border border-ygf-orange-100 flex items-center justify-center rounded-full hover:bg-ygf-orange-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              :aria-expanded="open"
              :aria-controls="open ? panelId : undefined"
              :aria-label="label"
              @click.stop="toggle">
            <img alt="" aria-hidden="true" :src="icon" class="h-5 w-5"/>
        </button>
        <!-- Opens below and right-aligned. It used to fly out sideways
             (`left-full`), which suited the old vertical side rail but would
             overflow the viewport from a horizontal header. -->
        <ul v-if="open"
            :id="panelId"
            data-language-panel
            class="absolute right-0 top-full mt-2 bg-white border border-ygf-orange-100 rounded-ygf-card shadow-ygf-md z-50 min-w-max overflow-hidden">
            <li v-for="loc in languages" :key="loc.code" class="whitespace-nowrap">
                <NuxtLink :to="loc.to" :lang="loc.code" :hreflang="loc.code" :aria-current="loc.current ? 'true' : undefined"
                          :data-testid="'language-option-' + loc.code"
                          class="flex min-h-11 items-center gap-2 px-4 py-2 text-ygf-black hover:bg-ygf-orange-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                          :class="loc.current ? 'font-semibold text-ygf-orange-800' : ''"
                          @click="choose(loc.code)">
                    {{ loc.label }}
                    <svg v-if="loc.current" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </NuxtLink>
            </li>
        </ul>
    </li>
</template>

<script lang="ts" setup>
import { useLanguagePicker } from '#engine/composables/useLanguagePicker'

/** `label` names the button ("Select language"); the icon beside it is decorative. */
defineProps<{
    icon: string
    label: string
}>()

const { open, rootRef, buttonRef, panelId, languages, toggle, choose } = useLanguagePicker()
</script>
