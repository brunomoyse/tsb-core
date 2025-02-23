<template>
  <label class="flex items-center space-x-2 cursor-pointer">
    <input type="checkbox" class="hidden peer" v-model="checked">
    <div class="w-5 h-5 border-2 border-tsb-red-lighter rounded-md flex items-center justify-center peer-checked:bg-black transition">
      <svg v-if="checked" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <span>
      <slot />
    </span>
  </label>
</template>

<script setup>
// Define the modelValue prop (the value bound with v-model)
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

// Set up the emit function for updating the modelValue
const emit = defineEmits(['update:modelValue'])

// Create a computed property that proxies the modelValue prop and emits changes
const checked = computed({
  get() {
    return props.modelValue
  },
  set(value) {
    emit('update:modelValue', value)
  }
})
</script>