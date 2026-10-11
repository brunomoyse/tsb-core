<template>
  <!--
    The row at the top of the menu: the customer's own products ("Vos favoris", "Déjà commandés") or the most ordered
    ones (utils/menuPicks.ts decides). The brand's own cards (`card` slot) under a heading the brand can restyle
    (`heading` slot), in a grid the brand passes as `gridClass` so the row looks like one of its categories.
  -->
  <section
    data-testid="menu-picks"
    :data-kind="picks.kind"
    :aria-labelledby="headingId"
    class="space-y-4"
  >
    <slot name="heading" :title="title" :heading-id="headingId">
      <h2 :id="headingId" class="ml-0 sm:ml-4 text-lg font-semibold text-neutral-800">
        {{ title }}
      </h2>
    </slot>
    <ul :class="gridClass">
      <li
        v-for="(product, index) in picks.products"
        :key="product.id"
        data-testid="menu-picks-item"
      >
        <slot name="card" :product="product" :index="index" />
      </li>
    </ul>
  </section>
</template>

<script lang="ts" setup>
import { computed, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { MenuPicks } from '#engine/utils/menuPicks'
import { useTracking } from '#engine/composables/useTracking'

const { picks, gridClass = 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4' } =
  defineProps<{ picks: MenuPicks; gridClass?: string }>()

const { t } = useI18n()
const { trackEvent } = useTracking()
const headingId = useId()

const title = computed(() => t(`menu.picks.${picks.kind}`))

// One "shown" per kind and page view: a signed-in customer's row switches from the popular products to their own.
const tracked = new Set<string>()
watch(
  () => picks.kind,
  (kind) => {
    if (!import.meta.client || tracked.has(kind)) return
    tracked.add(kind)
    trackEvent('menu_picks_shown', { kind, count: picks.products.length })
  },
  { immediate: true },
)
</script>
