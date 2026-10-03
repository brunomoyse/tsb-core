<template>
  <span
    v-if="pending"
    data-testid="quote-updating"
    role="status"
    class="text-xs font-normal text-neutral-600 whitespace-nowrap"
  >
    {{ $t('cart.quoteUpdating') }}
  </span>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useQuoteStore } from '#engine/stores/quote'

/* A subtle "updating prices…" next to a total while the server quote of the current cart is on its way (the total shown is the client's maths meanwhile). */
const pending = computed(() => useQuoteStore().pending)
</script>
