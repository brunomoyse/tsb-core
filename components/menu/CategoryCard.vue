<template>
    <button
        :aria-pressed="active"
        :class="chipClasses"
        role="button"
        @click="handleClick"
        :data-id="category.id"
    >
    <span class="truncate text-sm font-medium px-2">
      {{ displayName }}
    </span>
        <slot name="icon" v-if="showIcon" />
    </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ProductCategory } from '@/types';

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

const displayName = computed(() => {
    return props.category.name.toLowerCase().includes('bento')
        ? 'Bento'
        : props.category.name;
});

const chipClasses = computed(() => [
    'rounded-full px-3 py-2 text-sm font-semibold',
    props.active ? 'bg-black text-white' : 'bg-white text-gray-600',
].join(' '));
</script>
