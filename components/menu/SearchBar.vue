<template>
    <!-- Relative container to position icon and clear button -->
    <div class="relative">
        <!-- SR-only label for accessibility -->
        <label class="sr-only" for="searchInput">Search</label>

        <!-- The actual input field -->
        <input id="searchInput" :placeholder="$t('nav.search')" :value="modelValue" class="w-full px-10 py-3 rounded-2xl bg-tsb-two"
               type="search"
               @input="onInput"/>
        <!-- Magnifying glass icon (inline SVG) -->
        <img alt="Search" class="h-6 w-6 absolute left-3 top-1/2 transform -translate-y-1/2"
             src="/icons/search-icon.svg"/>
        <!-- Clear button (only shown if there's text) -->
        <button v-if="modelValue" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500
             hover:text-gray-700 focus:outline-none" type="button" @click="onClear">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                 stroke-width="2" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12"/>
            </svg>
        </button>
    </div>
</template>

<script lang="ts" setup>
defineProps<{
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

<style scoped>
input[type="search"]::-webkit-search-cancel-button {
    -webkit-appearance: none;
}
</style>
