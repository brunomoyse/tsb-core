<!-- components/navbar/MobileNavItem.vue -->
<template>
    <li class="w-full">
        <NuxtLinkLocale
            :to="to"
            :aria-label="label"
            active-class="bg-ygf-orange-100 text-ygf-orange-700"
            class="flex min-h-11 items-center justify-center space-x-2 rounded-xl px-4 py-3 transition-colors hover:bg-ygf-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-ygf-orange-300 focus-visible:ring-offset-2"
        >
            <img :alt="label" :src="icon" class="w-6 h-6"/>
            <span class="text-sm font-medium">{{ label }}</span>
        </NuxtLinkLocale>
    </li>
</template>

<script lang="ts" setup>
const { to, icon, label } = defineProps<{
    to?: string
    icon?: string
    label?: string
}>()
</script>
