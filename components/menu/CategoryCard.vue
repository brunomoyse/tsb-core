<!-- CategoryCard.vue -->
<template>
    <button :aria-pressed="active" :class="chipClasses" role="button" @click="handleClick">
        <!-- Category Name -->
        <span class="whitespace-nowrap">{{ category.name }}</span>
    </button>
</template>

<script lang="ts" setup>
import {computed} from 'vue'
import type {ProductCategory} from "@/types";

// Define props
const props = defineProps<{
    category: ProductCategory;
    active: boolean;
    showIcon?: boolean; // Optional prop to show/hide icon
}>();

// Define emits
const emit = defineEmits<{
    (e: 'select', id: string): void;
}>();

// Handle button click
const handleClick = () => {
    emit('select', props.category.id);
};

// Compute dynamic classes based on active state
const chipClasses = computed(() => {
    return `
      inline-flex items-center px-4 py-1.5 rounded-2xl text-sm font-medium transition-all duration-200 shadow-sm
      ${props.active
        ? 'bg-black text-white border border-slate-800'
        : 'bg-tsb-two text-black border border-slate-300 hover:bg-slate-200'
    }
    `;
});
</script>

<style scoped>
/* Optional: Add any additional component-specific styles here */
</style>
