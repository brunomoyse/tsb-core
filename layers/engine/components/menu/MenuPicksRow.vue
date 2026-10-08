<template>
  <!--
    The row at the top of the menu: the customer's own products ("Vos favoris", "Déjà commandés") or the most ordered
    ones (utils/menuPicks.ts decides). One horizontally scrolling line of the brand's own cards (`card` slot), under a
    heading the brand can restyle (`heading` slot).
  -->
  <section
    data-testid="menu-picks"
    :data-kind="picks.kind"
    :aria-labelledby="headingId"
    class="space-y-3"
  >
    <slot name="heading" :title="title" :heading-id="headingId">
      <h2 :id="headingId" class="ml-0 sm:ml-4 text-lg font-semibold text-neutral-800">
        {{ title }}
      </h2>
    </slot>
    <div class="relative">
      <ul
        ref="scrollerRef"
        class="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth motion-reduce:scroll-auto py-1 sm:gap-5"
      >
        <li
          v-for="(product, index) in picks.products"
          :key="product.id"
          data-testid="menu-picks-item"
          class="w-[44%] shrink-0 snap-start sm:w-[185px]"
        >
          <slot name="card" :product="product" :index="index" />
        </li>
      </ul>
      <!-- More to the right: the same gradient fade as the category strip -->
      <div
        class="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-tsb-one to-transparent transition-opacity duration-300"
        :class="canScrollRight ? 'opacity-100' : 'opacity-0'"
        aria-hidden="true"
      />
    </div>
  </section>
</template>

<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { MenuPicks } from '#engine/utils/menuPicks'
import { useTracking } from '#engine/composables/useTracking'

const { picks } = defineProps<{ picks: MenuPicks }>()

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

const scrollerRef = ref<HTMLElement | null>(null)
const canScrollRight = ref(false)
const update = () => {
  const el = scrollerRef.value
  if (!el) return
  canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
}
// Kept in a variable: when the row unmounts the template ref is already null.
let scroller: HTMLElement | null = null
let resizeObserver: ResizeObserver | null = null
onMounted(() => {
  scroller = scrollerRef.value
  if (!scroller) return
  scroller.addEventListener('scroll', update, { passive: true })
  resizeObserver = new ResizeObserver(update)
  resizeObserver.observe(scroller)
  update()
})
// The products change in place (popular, then the customer's own): the scroll width with them.
watch(
  () => picks.products.length,
  () => nextTick().then(update),
)
onBeforeUnmount(() => {
  scroller?.removeEventListener('scroll', update)
  scroller = null
  resizeObserver?.disconnect()
})
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
