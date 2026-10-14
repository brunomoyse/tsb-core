<template>
  <!-- Phosphor icon (assets/icons, raw SVG tinted by currentColor). Decorative: the control around it carries the label. -->
  <span
    class="inline-flex shrink-0 [&>svg]:w-full [&>svg]:h-full"
    :style="{ width: `${size}px`, height: `${size}px` }"
    aria-hidden="true"
    v-html="svg"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'

// Every icon of the folder, inlined at build time (each is one small path).
const ICONS = import.meta.glob<string>('../../assets/icons/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const { name, size = 20 } = defineProps<{
  /** File name without extension, e.g. `map-pin-fill`, `phone`, `storefront`. */
  name: string
  size?: number
}>()

const svg = computed(() => ICONS[`../../assets/icons/${name}.svg`] ?? '')
</script>
