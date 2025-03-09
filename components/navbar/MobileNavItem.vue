<!-- components/navbar/MobileNavItem.vue -->
<template>
    <li class="w-full">
        <NuxtLink
            :to="to"
            active-class="bg-tsb-one"
            class="flex items-center justify-center space-x-2 p-3 rounded-xl hover:bg-tsb-one transition-colors"
        >
            <img :alt="label" :src="icon" class="w-6 h-6"/>
            <span class="text-sm font-medium">{{ label }}</span>
        </NuxtLink>
    </li>
</template>

<script lang="ts" setup>
defineProps({
    to: String,
    icon: String,
    label: String
});
</script>
