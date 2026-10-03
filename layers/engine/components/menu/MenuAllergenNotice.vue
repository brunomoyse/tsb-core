<template>
  <div v-if="show" :class="contained ? 'max-w-7xl mx-auto mb-2 px-4' : 'mx-4 mb-2'">
    <!-- A notice, not a button row: the text wraps at 12px (nothing is cut off when the page is zoomed or the phone number is long), and the dismiss control is a full 44px target. -->
    <div
      class="min-h-11 pl-3 pr-1 py-1 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2 text-amber-800 text-xs leading-snug"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path
          d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01"
        />
      </svg>
      <span class="flex-1 min-w-0">
        {{ $t('menu.allergenNoticeShort') }}
        <a :href="phoneHref" class="underline font-medium text-amber-900 whitespace-nowrap">{{
          phoneLabel
        }}</a>
      </span>
      <button
        type="button"
        class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        :aria-label="$t('common.close')"
        @click="emit('dismiss')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-3 w-3"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
/* The compact, dismissible allergen notice (it scrolls away with the content). `contained` centres it in the
   page's `max-w-7xl` column; the page keeps the dismissed state. */
const {
  show,
  contained = false,
  phoneHref,
  phoneLabel,
} = defineProps<{
  show: boolean
  contained?: boolean
  phoneHref: string
  phoneLabel: string
}>()

const emit = defineEmits<{ dismiss: [] }>()
</script>
