<template>
    <li>
        <NuxtLinkLocale :to="to">
            <!-- Container with dynamic colors based on active route -->
            <div :class="[
                'relative group w-[50px] h-[50px] flex items-center justify-center rounded-full hover:shadow-md transition-shadow overflow-visible',
                isActive ? 'bg-black' : 'bg-white',
            ]">
                <!-- Icon with dynamic color -->
                <img :src="icon" :alt="alt" :class="['h-6 w-6 select-none', isActive ? 'invert' : '']"
                    draggable="false" />

                <!-- Tooltip positioned below -->
                <span v-if="tooltipText" :class="[
                    'absolute left-1/2 top-full -translate-x-1/2 mt-2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50 min-w-max',
                    isActive ? 'bg-white text-black' : 'bg-black text-white',
                ]">
                    {{ tooltipText }}
                </span>
            </div>
        </NuxtLinkLocale>
    </li>
</template>

<script setup lang="ts">
import { useRoute, computed } from '#imports';

interface NavItemProps {
    to: string;
    icon: string;
    alt?: string;
    tooltipText?: string;
}

const props = defineProps<NavItemProps>();

// Get the current route
const route = useRoute();

// Check if the current route matches the link's `to` prop
const isActive = computed(() => typeof route.name === 'string' && route.name.startsWith(props.to));
</script>