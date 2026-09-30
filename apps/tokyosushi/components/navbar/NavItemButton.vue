<template>
    <li>
        <button
            type="button"
            class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            :aria-label="tooltipText"
            @click="$emit('click')"
        >
            <div class="relative group w-[50px] h-[50px] flex items-center justify-center rounded-full bg-white text-gray-900 hover:shadow-md transition-shadow overflow-visible">
                <NavIcon :src="icon" class="h-6 w-6" />

                <!-- Badge -->
                <span
                    v-if="badge && badge > 0"
                    class="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-[20px] px-1 text-[11px] font-bold text-primary-foreground bg-primary rounded-full"
                >
                    {{ badge }}
                </span>

                <!-- Tooltip positioned below -->
                <span
                    v-if="tooltipText"
                    class="absolute left-1/2 top-full -translate-x-1/2 mt-2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-all duration-150 ease-out translate-y-1 group-hover:translate-y-0 whitespace-nowrap z-50 min-w-max bg-black text-white pointer-events-none"
                >
                    {{ tooltipText }}
                </span>
            </div>
        </button>
    </li>
</template>

<script lang="ts" setup>
import NavIcon from './NavIcon.vue'

interface NavItemButtonProps {
    icon: string
    tooltipText?: string
    badge?: number
}

const { icon, tooltipText, badge } = defineProps<NavItemButtonProps>()
defineEmits<{ click: [] }>()
</script>
