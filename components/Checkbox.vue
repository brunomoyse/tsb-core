<template>
    <label class="flex items-center space-x-2 cursor-pointer">
        <input v-model="checked" class="hidden peer" type="checkbox">
        <div
            class="w-5 h-5 border border-gray-300 rounded-md flex items-center justify-center peer-checked:bg-red-500 transition-colors duration-200">
            <Transition name="check-bounce">
                <svg v-if="checked" class="w-4 h-4 text-white" fill="none" stroke="currentColor"
                     stroke-width="3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </Transition>
        </div>
        <span>
      <slot/>
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

<style scoped>
.check-bounce-enter-active {
    animation: check-bounce 0.2s ease-out;
}
.check-bounce-leave-active {
    transition: transform 0.1s ease-in, opacity 0.1s ease-in;
}
.check-bounce-leave-to {
    transform: scale(0);
    opacity: 0;
}
</style>
