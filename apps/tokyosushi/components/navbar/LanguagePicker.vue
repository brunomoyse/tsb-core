<template>
  <div ref="rootRef" class="relative" data-language-picker>
    <!-- Trigger: always shows the language currently in use. A disclosure for the list of links below (audit A13). -->
    <button
      ref="buttonRef"
      type="button"
      data-testid="language-picker"
      :class="
        variant === 'rail'
          ? 'relative group w-[50px] h-[50px] bg-white text-neutral-900 flex flex-col items-center justify-center gap-0.5 rounded-full hover:shadow-md transition-shadow overflow-visible cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          : 'inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-neutral-700 hover:bg-tsb-four/40 transition-colors duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      "
      :aria-expanded="open"
      :aria-controls="open ? panelId : undefined"
      :aria-label="`${$t('nav.language')} (${$t('nav.currentLanguage', { language: current.label })})`"
      @click.stop="toggle"
    >
      <NavIcon
        src="/icons/translate-icon.svg"
        :class="variant === 'rail' ? 'h-5 w-5' : 'h-5 w-5 text-neutral-600'"
      />
      <span
        v-if="variant === 'rail'"
        class="text-[10px] font-semibold leading-none"
        aria-hidden="true"
        >{{ current.short }}</span
      >
      <template v-else>
        <span>{{ current.label }}</span>
        <svg
          class="h-4 w-4 text-neutral-600 transition-transform duration-300"
          :class="{ 'rotate-180': open }"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M19 9l-7 7-7-7" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </template>
      <!-- Tooltip positioned below, like the other rail items -->
      <span
        v-if="variant === 'rail' && !open"
        aria-hidden="true"
        class="absolute left-1/2 top-full -translate-x-1/2 mt-2 px-2 py-1 bg-black text-white text-xs font-normal rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50 min-w-max pointer-events-none"
      >
        {{ $t('nav.language') }}
      </span>
    </button>

    <!-- All languages as plain links (no listbox: these navigate), the current one marked -->
    <ul
      v-if="open"
      :id="panelId"
      data-language-panel
      :class="[
        'absolute bg-white border border-neutral-200 rounded-xl shadow-lg z-50 min-w-44 overflow-hidden py-1',
        PLACEMENTS[placement],
      ]"
    >
      <li v-for="lang in languages" :key="lang.code" class="whitespace-nowrap">
        <NuxtLink
          :to="lang.to"
          :data-testid="'language-option-' + lang.code"
          :lang="lang.code"
          :hreflang="lang.code"
          :aria-current="lang.current ? 'true' : undefined"
          :class="[
            'flex min-h-11 items-center justify-between gap-4 px-4 text-sm transition-colors duration-300 hover:bg-tsb-four/40 focus:outline-none focus-visible:bg-tsb-four/40',
            lang.current ? 'font-semibold text-primary-hover' : 'text-neutral-700',
          ]"
          @click="choose(lang.code)"
        >
          {{ lang.label }}
          <svg
            v-if="lang.current"
            class="h-4 w-4"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>

<script lang="ts" setup>
import NavIcon from './NavIcon.vue'
import { useLanguagePicker } from '#engine/composables/useLanguagePicker'

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

const { open, rootRef, buttonRef, panelId, languages, current, toggle, choose } =
  useLanguagePicker()
</script>
