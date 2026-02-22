<template>
    <button
        :aria-pressed="active"
        class="relative overflow-hidden shrink-0 rounded-xl px-3.5 py-2.5 text-sm whitespace-nowrap transition-all duration-300 ease-out select-none"
        :class="active
            ? 'bg-tsb-four text-red-900/80 font-semibold'
            : 'text-gray-400 font-medium hover:bg-tsb-four/40 hover:text-gray-500'"
        @click="handleClick"
        :data-id="category.id"
    >
        {{ displayName }}
        <!-- Red accent bar clipped by rounded corners -->
        <span
            class="absolute bottom-0 left-0 right-0 h-[2.5px] bg-red-400 transition-all duration-300 ease-out origin-center"
            :class="active ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'"
        />
    </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ProductCategory } from '@/types';

const props = defineProps<{
    category: ProductCategory;
    active: boolean;
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
</script>
