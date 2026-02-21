<template>
    <div>
        <NuxtLinkLocale :to="to">
            <!-- Container with overflow-visible -->
            <div class="relative group w-[50px] h-[50px] flex items-center justify-center overflow-visible">
                <img :alt="alt" :src="icon" width="50" height="50" class="fit"/>

                <!-- Tooltip positioned below -->
                <span v-if="tooltipText"
                      class="absolute left-1/2 top-full -translate-x-1/2 mt-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50 min-w-max">
                    {{ tooltipText }}
                </span>
            </div>
        </NuxtLinkLocale>
    </div>
</template>

<script lang="ts" setup>
interface NavItemProps {
    to: string
    icon: string
    alt?: string
    tooltipText?: string
}

defineProps<NavItemProps>()
</script>
