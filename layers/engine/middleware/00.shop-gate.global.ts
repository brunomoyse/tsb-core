// Middleware: 00.shop-gate.global.ts, the shop routes redirect home while the shop is off (utils/shopGate.ts).
import { defineNuxtRouteMiddleware, navigateTo } from 'nuxt/app'
import type { RouteLocationNormalized } from 'vue-router'
import { shopGateRedirect } from '#engine/utils/shopGate'
import { useShopEnabled } from '#engine/composables/useShopEnabled'

/*
 * Server render and client navigation alike: a 302 on the server, so a crawler or an old link never sees a page.
 * The `00.` prefix runs it before auth.global.ts, which would otherwise start a login for /me first.
 */
export default defineNuxtRouteMiddleware((to: RouteLocationNormalized) => {
  if (useShopEnabled()) return
  const target = shopGateRedirect(to.path)
  if (target === null) return
  return navigateTo(target, { redirectCode: 302 })
})
