<template>
  <ShopMenu v-if="shopEnabled" />
  <StaticMenu v-else />
</template>

<script setup lang="ts">
/*
 * /menu: the dynamic, orderable menu while the shop is on; while it is switched off (NUXT_PUBLIC_SHOP_ENABLED=false,
 * utils/shopGate.ts) the brand keeps this route up (staticMenuWhenShopClosed) and shows the static menu of the old
 * ygfliege.be instead: broths, ingredients and the price by weight, nothing to order.
 */
import { defineAsyncComponent } from 'vue'
import { useShopEnabled } from '#engine/composables/useShopEnabled'

definePageMeta({
  sitemap: { priority: 0.9, changefreq: 'weekly' },
  // With the shop on, the layout leaves the restaurant config to the dynamic menu on the server (see layouts/default.vue).
  loadsRestaurantConfig: true,
})

// Only the variant in use is loaded: a closed shop never ships the dynamic menu's code, and the reverse.
const ShopMenu = defineAsyncComponent(() => import('~/components/menu/ShopMenu.vue'))
const StaticMenu = defineAsyncComponent(() => import('~/components/menu/StaticMenu.vue'))

const shopEnabled = useShopEnabled()
</script>
