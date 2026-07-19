<!-- components/navbar/MobileNavItem.vue -->
<template>
    <li class="w-full">
        <NuxtLinkLocale
            :to="to"
            :aria-label="label"
            active-class="bg-white/20 font-semibold"
            class="flex min-h-12 items-center justify-center gap-3 rounded-ygf-btn px-6 py-3 text-white transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        >
            <!-- Icons are brand-orange glyphs; invert them so they read on the
                 orange overlay. Decorative — the label carries the meaning. -->
            <img v-if="icon" :src="icon" alt="" aria-hidden="true" class="w-5 h-5 brightness-0 invert"/>
            <span class="text-base font-medium">{{ label }}</span>
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
