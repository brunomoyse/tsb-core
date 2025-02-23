<template>
  <!-- Relative container to position icon and clear button -->
  <div class="relative">
    <!-- SR-only label for accessibility -->
    <label for="searchInput" class="sr-only">Search</label>

    <!-- The actual input field -->
    <input id="searchInput" :value="modelValue" @input="onInput" type="text"
      class="w-full px-10 py-2 rounded-2xl bg-tsb-two"
      :placeholder="$t('nav.search')" />
    <!-- Magnifying glass icon (inline SVG) -->
    <img src="/icons/search-icon.svg" alt="Search" class="h-6 w-6 absolute left-3 top-1/2 transform -translate-y-1/2" />
    <!-- Clear button (only shown if there's text) -->
    <button v-if="modelValue" type="button" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500
             hover:text-gray-700 focus:outline-none" @click="onClear">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
        stroke-width="2" viewBox="0 0 24 24">
        <path d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits(['update:modelValue'])

// Local helper function for input events
function onInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

// Clear the input value
function onClear() {
  emit('update:modelValue', '')
}
</script>
