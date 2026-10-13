<template>
  <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
    <span
      class="inline-flex items-center gap-1 text-xs font-semibold rounded-ygf-btn px-3 py-1 border"
      :class="
        broth.spiceLevel > 0
          ? 'text-ygf-black bg-ygf-bg border-ygf-orange/10'
          : 'text-gray-600 bg-ygf-cream border-transparent'
      "
    >
      <span
        v-if="broth.spiceLevel > 0"
        class="inline-flex items-center text-ygf"
        aria-hidden="true"
      >
        <span
          v-for="n in broth.spiceLevel"
          :key="n"
          class="block w-3.5 h-3.5 [&>svg]:w-full [&>svg]:h-full"
          v-html="pepperIcon"
        />
      </span>
      {{ $t(`mkt.broths.${broth.key}.spice`) }}
    </span>
    <span
      v-if="broth.vegan"
      class="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.03em] rounded-ygf-btn px-3 py-1 border text-ygf-success-dark bg-ygf-success/10 border-ygf-success/30"
    >
      <span
        class="block w-3 h-3 [&>svg]:w-full [&>svg]:h-full"
        aria-hidden="true"
        v-html="leafIcon"
      />
      {{ $t('mkt.broths.vegan_badge') }}
    </span>
  </div>
</template>

<script setup lang="ts">
// Spice level (chilis + label) and vegan badge of a broth, as on the old ygfliege.be (broth selector, static menu).
import type { Broth } from '~/data/broths'
// Phosphor icons (same set as the old site); raw SVGs, tinted via currentColor.
import leafIcon from '~/assets/icons/leaf.svg?raw'
import pepperIcon from '~/assets/icons/pepper-fill.svg?raw'

const { broth } = defineProps<{ broth: Broth }>()
</script>
