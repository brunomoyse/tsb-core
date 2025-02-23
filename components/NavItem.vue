<template>
    <li>
        <NuxtLinkLocale :to="to">
            <!-- Container with overflow-visible -->
            <div
                class="relative group w-[50px] h-[50px] bg-white flex items-center justify-center rounded-full hover:shadow-md transition-shadow overflow-visible">
                <img :src="icon" :alt="alt" class="h-6 w-6" />

                <!-- Tooltip positioned below -->
                <span v-if="tooltipText"
                    class="absolute left-1/2 top-full -translate-x-1/2 mt-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50">
                    {{ tooltipText }}
                </span>
            </div>
        </NuxtLinkLocale>
    </li>
</template>

<script setup lang="ts">
interface NavItemProps {
    to: string
    icon: string
    alt?: string
    tooltipText?: string
}
defineProps<NavItemProps>()
</script>