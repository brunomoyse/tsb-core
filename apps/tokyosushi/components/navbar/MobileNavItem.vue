<!-- components/navbar/MobileNavItem.vue -->
<template>
  <li class="w-full">
    <NuxtLinkLocale
      :to="to"
      active-class="bg-tsb-four text-primary-hover"
      class="flex min-h-11 items-center justify-center space-x-2 rounded-xl px-4 py-3 transition-colors hover:bg-tsb-one focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <NavIcon v-if="icon" :src="icon" class="w-6 h-6" />
      <span class="text-sm font-medium">{{ label }}</span>
    </NuxtLinkLocale>
  </li>
</template>

<script lang="ts" setup>
import NavIcon from './NavIcon.vue'

const {
  to = undefined,
  icon = undefined,
  label = undefined,
} = defineProps<{
  to?: string
  icon?: string
  label?: string
}>()
</script>
