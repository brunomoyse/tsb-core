<template>
    <button
        :aria-pressed="active"
        :class="chipClasses"
        role="button"
        @click="handleClick"
    >
        <span class="truncate text-sm font-medium px-2">
            {{ category.name.includes('bento') ? 'Bento' : category.name }}
        </span>
    </button>
</template>

<script lang="ts" setup>
import {computed} from 'vue'
import type {ProductCategory} from "@/types";

const props = defineProps<{
    category: ProductCategory;
    active: boolean;
    showIcon?: boolean;
}>();

const emit = defineEmits<{
    (e: 'select', id: string): void;
}>();

const handleClick = () => {
    emit('select', props.category.id);
};

const chipClasses = computed(() => {
    return `
        w-full h-14 p-2 rounded-lg flex items-center justify-center
        transition-all duration-150 border
        ${
        props.active
            ? 'bg-tsb-four border-tsb-three shadow-md'
            : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
    }
        md:hover:scale-[1.02] md:hover:shadow-sm
    `;
});
</script>
