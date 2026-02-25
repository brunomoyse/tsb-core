<template>
    <li>
        <NuxtLinkLocale :to="to">
            <!-- Container with dynamic colors based on active route -->
            <div :class="[
                'relative group w-[50px] h-[50px] flex items-center justify-center rounded-full hover:shadow-md transition-shadow overflow-visible',
                isActive ? 'bg-tsb-four text-red-700' : 'bg-white',
            ]">
                <!-- Icon with dynamic color -->
                <img :alt="alt" :class="['h-6 w-6 select-none', isActive ? '' : '']" :src="icon"
                     draggable="false"/>

                <!-- Bottom indicator bar -->
                <span class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-red-500 rounded-full transition-transform duration-200 ease-out origin-center"
                      :class="isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'"
                />

                <!-- Tooltip positioned below -->
                <span v-if="tooltipText"
                      class="absolute left-1/2 top-full -translate-x-1/2 mt-2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-all duration-150 ease-out translate-y-1 group-hover:translate-y-0 whitespace-nowrap z-50 min-w-max bg-black text-white">
                    {{ tooltipText }}
                </span>
            </div>
        </NuxtLinkLocale>
    </li>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

import { useRoute } from '#imports'

interface NavItemProps {
    to: string;
    icon: string;
    alt?: string;
    tooltipText?: string;
}

const {
    to,
    icon,
    alt,
    tooltipText
} = defineProps<NavItemProps>()

// Get the current route
const route = useRoute()

// Updated active state check using path
const isActive = computed(() => {
    // Normalize to to always start with "/"
    const normalizedTo = to.startsWith('/') ? to : `/${to}`;
    // Remove the first segment (locale) from route.path, e.g. "/fr/me" becomes "/me"
    const normalizedPath = route.path.replace(/^\/[^/]+/, '');
    return normalizedPath === normalizedTo || normalizedPath.startsWith(`${normalizedTo}/`);
})
</script>
