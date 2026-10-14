<template>
  <!-- The photo a brand chose for a cart line (useCartItemLabel().itemPresentation), e.g. the broth of a composed bowl. -->
  <picture>
    <source :srcset="image.avif" type="image/avif" />
    <source :srcset="image.webp" type="image/webp" />
    <img
      alt=""
      :src="image.fallback"
      class="max-w-full max-h-full object-contain"
      :width="size"
      :height="size"
      draggable="false"
    />
  </picture>
</template>

<script setup lang="ts">
import type { CartLinePresentation } from '#engine/types'

const { size = 48 } = defineProps<{
  image: NonNullable<CartLinePresentation['image']>
  size?: number
}>()
</script>
