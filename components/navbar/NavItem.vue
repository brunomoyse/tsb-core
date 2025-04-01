<template>
    <li>
        <NuxtLinkLocale :to="to">
            <!-- Container with dynamic colors based on active route -->
            <div :class="[
                'relative group w-[50px] h-[50px] flex items-center justify-center rounded-full hover:shadow-md transition-shadow overflow-visible',
                isActive ? 'bg-black' : 'bg-white',
            ]">
                <!-- Icon with dynamic color -->
                <img :alt="alt" :class="['h-6 w-6 select-none', isActive ? 'invert' : '']" :src="icon"
                     draggable="false"/>

                <!-- Tooltip positioned below -->
                <span v-if="tooltipText"
                      class="absolute left-1/2 top-full -translate-x-1/2 mt-2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50 min-w-max bg-black text-white">
                    {{ tooltipText }}
                </span>
            </div>
        </NuxtLinkLocale>
    </li>
</template>

<script lang="ts" setup>
import {computed, useRoute} from '#imports';

interface NavItemProps {
    to: string;
    icon: string;
    alt?: string;
    tooltipText?: string;
}

const props = defineProps<NavItemProps>();

// Get the current route
const route = useRoute();

// Updated active state check using path
const isActive = computed(() => {
    // Normalize props.to to always start with "/"
    const normalizedTo = props.to.startsWith('/') ? props.to : `/${props.to}`;
    // Remove the first segment (locale) from route.path, e.g. "/fr/me" becomes "/me"
    const normalizedPath = route.path.replace(/^\/[^/]+/, '');
    return normalizedPath === normalizedTo || normalizedPath.startsWith(`${normalizedTo}/`);
});
</script>
