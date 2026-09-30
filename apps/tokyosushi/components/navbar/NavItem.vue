<template>
    <li>
        <component
            :is="href ? 'a' : NuxtLinkLocale"
            :to="href ? undefined : to"
            :href="href"
            :aria-label="ariaLabel || tooltipText"
            :aria-current="isActive ? 'page' : undefined"
            class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            <!-- Container with dynamic colors based on active route -->
            <div :class="[
                'relative group w-[50px] h-[50px] flex items-center justify-center rounded-full hover:shadow-md transition-all duration-300 ease-out overflow-visible',
                isActive ? 'bg-tsb-four text-primary-hover' : 'bg-white text-gray-900',
            ]">
                <NavIcon :src="icon" class="h-6 w-6" />

                <!-- Bottom indicator bar -->
                <span class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-primary rounded-full transition-transform duration-200 ease-out origin-center"
                      :class="isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'"
                />

                <!-- Tooltip positioned below -->
                <span v-if="tooltipText"
                      class="absolute left-1/2 top-full -translate-x-1/2 mt-2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-all duration-150 ease-out translate-y-1 group-hover:translate-y-0 whitespace-nowrap z-50 min-w-max bg-black text-white pointer-events-none">
                    {{ tooltipText }}
                </span>
            </div>
        </component>
    </li>
</template>

<script lang="ts" setup>
import { computed, resolveComponent } from 'vue'
import NavIcon from './NavIcon.vue'

import { useRoute } from '#imports'

interface NavItemProps {
    /** Locale-less path, e.g. "/menu". Ignored when `href` is set. */
    to?: string;
    /** External target (e.g. a tel: link); renders a plain anchor. */
    href?: string;
    icon: string;
    tooltipText?: string;
    ariaLabel?: string;
}

const {
    to,
    href,
    icon,
    tooltipText,
    ariaLabel
} = defineProps<NavItemProps>()

const NuxtLinkLocale = resolveComponent('NuxtLinkLocale')

// Get the current route
const route = useRoute()

// Updated active state check using path
const isActive = computed(() => {
    if (href || !to) return false
    // Remove the first segment (locale) from route.path, e.g. "/fr/me" becomes "/me"
    const normalizedPath = route.path.replace(/^\/[^/]+/u, '');
    return normalizedPath === to || normalizedPath.startsWith(`${to}/`);
})
</script>
