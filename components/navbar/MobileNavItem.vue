<!-- components/navbar/MobileNavItem.vue -->
<template>
    <li class="w-full">
        <NuxtLink 
            :to="to" 
            class="flex items-center justify-center space-x-2 p-3 rounded-xl hover:bg-tsb-one transition-colors"
            active-class="bg-tsb-one"
        >
            <img :src="icon" :alt="label" class="w-6 h-6" />
            <span class="text-sm font-medium">{{ label }}</span>
        </NuxtLink>
    </li>
</template>

<script setup lang="ts">
defineProps({
    to: String,
    icon: String,
    label: String
});
</script>