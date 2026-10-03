<template>
  <span
    v-if="variant === 'pill'"
    :class="['inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm', DIET[kind].tone]"
  >
    <DietIcon :kind="kind" class="h-3.5 w-3.5" />
    {{ $t(DIET[kind].label) }}
  </span>
  <span
    v-else
    role="img"
    :aria-label="$t(DIET[kind].label)"
    :title="$t(DIET[kind].label)"
    :class="['flex h-5 w-5 items-center justify-center rounded-full', DIET[kind].tone]"
  >
    <DietIcon :kind="kind" class="h-3 w-3" />
  </span>
</template>

<script lang="ts" setup>
import type { DietKind } from './DietIcon.vue'

// One color + label per dietary marker, shared by the card dot and the modal pill.
const DIET: Record<DietKind, { label: string; tone: string }> = {
  halal: { label: 'menu.halal', tone: 'bg-blue-50 text-blue-700' },
  vegetarian: { label: 'menu.vegetarian', tone: 'bg-emerald-50 text-emerald-700' },
  spicy: { label: 'menu.spicy', tone: 'bg-red-50 text-red-700' },
}

const { kind, variant = 'dot' } = defineProps<{
  kind: DietKind
  variant?: 'dot' | 'pill'
}>()
</script>
