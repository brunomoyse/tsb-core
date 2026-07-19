<template>
    <div>
        <NuxtLinkLocale
            :to="to"
            :aria-label="ariaLabel || alt"
            class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ygf-orange-300"
        >
            <!-- Container with overflow-visible -->
            <div
                class="relative group flex items-center justify-center overflow-visible"
                :style="{ width: `${size}px`, height: `${size}px` }"
            >
                <picture>
                    <source :srcset="icon.replace('.png', '.avif')" type="image/avif" />
                    <source :srcset="icon.replace('.png', '.webp')" type="image/webp" />
                    <img :alt="alt" :src="icon" :width="size" :height="size" class="fit" />
                </picture>

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
    ariaLabel?: string
    size?: number
}

const { to, icon, alt, tooltipText, ariaLabel, size = 50 } = defineProps<NavItemProps>()
</script>
