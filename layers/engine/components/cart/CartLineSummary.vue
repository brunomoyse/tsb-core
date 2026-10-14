<template>
  <!-- A brand-presented line (useCartItemLabel().itemPresentation): one summary line, the full detail on demand. -->
  <div class="min-w-0">
    <p data-testid="cart-item-summary" class="text-xs text-primary-700 break-words">
      {{ presentation.summary }}
    </p>
    <details v-if="presentation.details.length > 0" class="group/detail text-xs text-neutral-600">
      <summary
        class="inline-flex min-h-8 cursor-pointer select-none list-none items-center gap-1 font-medium text-neutral-700 hover:text-primary-700 [&::-webkit-details-marker]:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        {{ $t('cart.showDetail') }}
        <svg
          class="h-3.5 w-3.5 transition-transform duration-300 group-open/detail:rotate-180"
          viewBox="0 0 256 256"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"
          />
        </svg>
      </summary>
      <ul data-testid="cart-item-detail" class="mt-0.5 mb-1 space-y-0.5">
        <li v-for="(line, index) in presentation.details" :key="index" class="break-words">
          {{ line }}
        </li>
      </ul>
    </details>
  </div>
</template>

<script setup lang="ts">
import type { CartLinePresentation } from '#engine/types'

defineProps<{ presentation: CartLinePresentation }>()
</script>
