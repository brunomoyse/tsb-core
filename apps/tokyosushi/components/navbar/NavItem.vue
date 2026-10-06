<template>
  <li>
    <component
      :is="NuxtLinkLocale"
      :to="to"
      :aria-label="ariaLabel || tooltipText"
      :aria-current="isActive ? 'page' : undefined"
      class="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <!-- Container with dynamic colors based on active route -->
      <div
        :class="[
          'relative group w-[50px] h-[50px] flex items-center justify-center rounded-full hover:shadow-md transition-all duration-300 ease-out overflow-visible',
          isActive ? 'bg-tsb-four text-primary-hover' : 'bg-white text-neutral-900',
        ]"
      >
        <NavIcon :src="icon" class="h-6 w-6" />

        <!-- Badge (e.g. the cart count); the count is part of the link's accessible name, so it is decorative here -->
        <span
          v-if="badge && badge > 0"
          aria-hidden="true"
          class="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-[20px] px-1 text-[11px] font-bold text-white bg-primary-600 rounded-full"
        >
          {{ badge }}
        </span>

        <!-- Bottom indicator bar -->
        <span
          class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-primary-600 rounded-full transition-transform duration-200 ease-out origin-center"
          :class="isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'"
        />

        <!-- Tooltip positioned below -->
        <span
          v-if="tooltipText"
          class="absolute left-1/2 top-full -translate-x-1/2 mt-2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-all duration-150 ease-out translate-y-1 group-hover:translate-y-0 whitespace-nowrap z-50 min-w-max bg-black text-white pointer-events-none"
        >
          {{ tooltipText }}
        </span>
      </div>
    </component>
  </li>
</template>

<script lang="ts" setup>
import { computed, resolveComponent } from 'vue'
import NavIcon from './NavIcon.vue'

import { useRoute } from '#imports'

interface NavItemProps {
  /** Locale-less path, e.g. "/menu". */
  to?: string
  icon: string
  tooltipText?: string
  ariaLabel?: string
  badge?: number
}

const {
  to = undefined,
  icon,
  tooltipText = undefined,
  ariaLabel = undefined,
  badge = 0,
} = defineProps<NavItemProps>()

const NuxtLinkLocale = resolveComponent('NuxtLinkLocale')

// Get the current route
const route = useRoute()

// Updated active state check using path
const isActive = computed(() => {
  if (!to) return false
  // Remove the first segment (locale) from route.path, e.g. "/fr/me" becomes "/me"
  const normalizedPath = route.path.replace(/^\/[^/]+/u, '')
  return normalizedPath === to || normalizedPath.startsWith(`${to}/`)
})
</script>
