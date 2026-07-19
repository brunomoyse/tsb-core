<!-- components/navbar/MobileNavItem.vue -->
<template>
    <li class="w-full">
        <NuxtLinkLocale
            :to="to"
            :aria-label="label"
            active-class="bg-white/20 font-semibold"
            class="flex min-h-12 items-center justify-center rounded-ygf-btn px-6 py-3 text-white transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        >
            <!-- Text-only, mirroring the vitrine site's mobile menu. -->
            <span class="text-base font-medium">{{ label }}</span>
        </NuxtLinkLocale>
    </li>
</template>

<script lang="ts" setup>
const { to, label } = defineProps<{
    to?: string
    label?: string
}>()
</script>
