<template>
  <!-- Bundled hugeicons glyph; inherits the parent's text color. -->
  <span aria-hidden="true" class="diet-icon inline-flex shrink-0" v-html="ICONS[kind]" />
</template>

<script lang="ts" setup>
import fire from '../assets/icons/fire-02.svg?raw'
import halal from '../assets/icons/halal.svg?raw'
import leaf from '../assets/icons/leaf-01.svg?raw'

export type DietKind = 'halal' | 'vegetarian' | 'spicy'

const ICONS: Record<DietKind, string> = { halal, vegetarian: leaf, spicy: fire }

const { kind } = defineProps<{ kind: DietKind }>()
</script>

<style scoped>
.diet-icon :deep(svg) {
  width: 100%;
  height: 100%;
}
</style>
