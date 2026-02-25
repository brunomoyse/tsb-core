<!-- components/navbar/MobileNavItem.vue -->
<template>
    <li class="w-full">
        <NuxtLinkLocale
            :to="to"
            active-class="bg-tsb-four"
            class="flex items-center justify-center space-x-2 p-3 rounded-xl hover:bg-tsb-one transition-colors"
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
