<template>
  <form autocomplete="off">
    <!-- ADDRESS FIELD -->
    <div class="relative">
      <label class="block text-sm text-neutral-700 mb-1" :for="inputId">
        {{ $t('form.address.label') }}
      </label>
      <div class="relative">
        <input
          :id="inputId"
          ref="addressInput"
          v-model="addressQuery"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          autocomplete="off"
          :aria-expanded="isExpanded"
          :aria-controls="listboxId"
          :aria-activedescendant="activeDescendant"
          :aria-describedby="selectedAddress ? undefined : hintId"
          :placeholder="$t('form.address.placeholder')"
          :class="
            selectedAddress
              ? 'sr-only'
              : 'w-full px-3.5 py-2.5 pr-10 bg-white/60 backdrop-blur-sm border border-neutral-200/80 rounded-xl text-neutral-900 placeholder-neutral-500 focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring focus-visible:outline-none transition-all duration-300'
          "
          :readonly="Boolean(selectedAddress)"
          :tabindex="selectedAddress ? -1 : undefined"
          @focus="onFocus"
          @blur="onBlur"
          @keydown="onKeydown"
          @input="onInput"
        />
        <div
          v-if="!selectedAddress && isLoadingAddress"
          class="absolute top-0 bottom-0 right-1 flex items-center gap-1"
        >
          <svg
            class="w-5 h-5 mr-1 text-neutral-400 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
        <!-- The chosen address, wrapped in full (a one-line input cut "Avenue du Présider…" at 320 px); the input above stays for screen readers. -->
        <div
          v-if="selectedAddress"
          data-testid="address-selected"
          class="flex items-start gap-2 rounded-xl border border-neutral-200/80 bg-white/60 py-1.5 pl-3.5 pr-1"
        >
          <svg
            v-if="!isLoadingAddress"
            class="mt-3 w-5 h-5 shrink-0 text-green-500"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd"
            />
          </svg>
          <p
            class="min-w-0 flex-1 self-center py-1 break-words text-neutral-900"
            aria-hidden="true"
          >
            {{ addressQuery }}
          </p>
          <button
            v-if="!isLoadingAddress"
            type="button"
            data-testid="address-clear"
            :aria-label="$t('form.address.clear')"
            class="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-neutral-600 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            @click="clearAddress"
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path
                fill-rule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
      <!-- Suggestions: in the flow of the form, not floating over it, so inside a sheet they push the content down (and the sheet scrolls) instead of running past the sheet's bottom edge, unreachable. -->
      <ul
        v-show="isExpanded"
        :id="listboxId"
        role="listbox"
        :aria-label="$t('form.address.label')"
        class="mt-1.5 w-full bg-white border border-neutral-200 shadow-md max-h-[min(15rem,40dvh)] overflow-auto rounded-xl"
        @mousedown.prevent
      >
        <li
          v-for="(suggestion, index) in suggestions"
          :id="optionId(index)"
          :key="suggestion.placeId"
          role="option"
          :aria-selected="highlightedIndex === index"
          class="p-3 cursor-pointer border-b border-neutral-100 last:border-b-0"
          :class="{ 'bg-neutral-100 ring-2 ring-inset ring-ring': highlightedIndex === index }"
          @mouseenter="hover(index)"
          @mousedown="selectSuggestion(suggestion)"
        >
          <div class="font-medium text-sm text-neutral-900">{{ suggestion.mainText }}</div>
          <div class="text-xs text-neutral-600 mt-0.5">{{ suggestion.secondaryText }}</div>
        </li>
      </ul>
      <!-- Announces the number of suggestions, the selection and the clearing (the list itself is not a live region) -->
      <div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {{ statusMessage }}
      </div>
      <div
        v-if="!selectedAddress"
        :id="hintId"
        class="mt-2 flex items-start gap-2 rounded-md border px-3 py-2 text-xs"
        :class="
          showNoMatchHint
            ? 'border-amber-300 bg-amber-50 text-amber-800'
            : 'border-neutral-200 bg-neutral-50 text-neutral-600'
        "
      >
        <svg
          class="w-4 h-4 shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
        </svg>
        <p v-if="showNoMatchHint">
          <span class="font-semibold">{{ $t('form.address.noMatch') }}</span>
          <span class="block mt-0.5 opacity-90">
            {{ $t('form.address.callHint') }}
            <a :href="phoneHref" class="underline font-medium whitespace-nowrap">{{
              phoneLabel
            }}</a>
          </span>
        </p>
        <p v-else>
          <span class="font-semibold">{{ $t('form.address.houseNumberRequired') }}</span>
          <span class="block mt-0.5 opacity-90">{{ $t('form.address.example') }}</span>
        </p>
      </div>
    </div>
  </form>
</template>

<script lang="ts" setup>
import type { Address } from '#engine/types'
import { useAddressAutocomplete } from '#engine/composables/useAddressAutocomplete'

const { phoneHref, phoneLabel } = useBrandPhone()

const emit = defineEmits<{
  'update:address': [address: Address | null]
}>()

// Search, selection and the combobox keyboard/ARIA behaviour live in the engine, shared with the other brand.
const {
  inputId,
  listboxId,
  hintId,
  optionId,
  addressInput,
  addressQuery,
  suggestions,
  selectedAddress,
  isLoadingAddress,
  highlightedIndex,
  isExpanded,
  activeDescendant,
  showNoMatchHint,
  statusMessage,
  onFocus,
  onBlur,
  onInput,
  onKeydown,
  selectSuggestion,
  clearAddress,
  hover,
} = useAddressAutocomplete((address) => emit('update:address', address))
</script>
