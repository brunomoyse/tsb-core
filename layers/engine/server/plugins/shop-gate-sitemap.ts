import { isShopEnabledValue, isShopUrl } from '../../utils/shopGate'
import { defineNitroPlugin, useRuntimeConfig } from 'nitropack/runtime'

/*
 * The shop switched off (`NUXT_PUBLIC_SHOP_ENABLED=false`, utils/shopGate.ts): its routes redirect home, so the
 * sitemap drops them. The other private routes are already left out at build time (`sitemap.exclude`); the menu is
 * the one public page this removes, and only while the shop is off.
 */
export default defineNitroPlugin((nitroApp) => {
  if (isShopEnabledValue(useRuntimeConfig().public.shopEnabled)) return
  nitroApp.hooks.hook('sitemap:resolved', (ctx) => {
    ctx.urls = ctx.urls.filter((entry) => {
      const loc: unknown = typeof entry === 'string' ? entry : entry.loc
      return typeof loc !== 'string' || !isShopUrl(loc)
    })
  })
})
