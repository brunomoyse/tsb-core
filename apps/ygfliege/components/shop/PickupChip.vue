<template>
  <!-- Takeaway only (audit 2c): where the order is collected, instead of a delivery-zone chip. Opens the map. -->
  <a
    :href="brand.mapsUrl"
    target="_blank"
    rel="noopener"
    data-testid="pickup-chip"
    class="chip min-w-0 gap-1.5"
    :title="`${$t('cart.pickup')} · ${brand.address.street}`"
  >
    <span class="text-ygf-orange-on-white shrink-0"
      ><MktIcon name="map-pin-fill" :size="16"
    /></span>
    <span class="truncate">
      <span :class="{ 'sr-only': compact }">{{ $t('cart.pickup') }} · </span
      >{{ brand.address.street }}
    </span>
  </a>
</template>

<script setup lang="ts">
import MktIcon from '~/components/mkt/MktIcon.vue'
import { useAppConfig } from '#imports'

// `compact` (beside the menu search on a phone): the street alone, "À emporter" stays for screen readers.
const { compact = false } = defineProps<{ compact?: boolean }>()

const { brand } = useAppConfig()
</script>
