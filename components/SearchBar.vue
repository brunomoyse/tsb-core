<template>
  <!-- Relative container to position icon and clear button -->
  <div class="relative">
    <!-- SR-only label for accessibility -->
    <label for="searchInput" class="sr-only">Search</label>
    
    <!-- The actual input field -->
    <input
      id="searchInput"
      :value="modelValue"
      @input="onInput"
      type="text"
      class="w-full border rounded-md px-10 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      placeholder="Search..."
    />
    
    <!-- Magnifying glass icon (inline SVG) -->
    <svg
      class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      viewBox="0 0 24 24"
    >
      <path d="M21 21l-4.35-4.35m0 0A9 9 0 104.35 4.35a9 9 0 0012.7 12.7z" />
    </svg>
    
    <!-- Clear button (only shown if there's text) -->
    <button
      v-if="modelValue"
      type="button"
      class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500
             hover:text-gray-700 focus:outline-none"
      @click="onClear"
    >
    <svg
        class="w-5 h-5"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        viewBox="0 0 24 24"
      >
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
