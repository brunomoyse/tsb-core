import { type HtmlParts, deferModuleGraph } from '../../utils/deferHydration'
import { defineNitroPlugin, useRuntimeConfig } from 'nitropack/runtime'

/*
 * Production only: the dev server serves modules in its own way (see utils/deferHydration.ts for what this does).
 *
 * `runtimeConfig.deferHydration` (env `NUXT_DEFER_HYDRATION=true`, read at server start, no rebuild) selects the FULL
 * deferral of the entry script; it is off by default, the reduced variant is what ships.
 */
export default defineNitroPlugin((nitroApp) => {
  if (import.meta.dev) return
  // Nitro turns the env value into a boolean, but a config given as text must work too.
  const full = ['true', '1'].includes(String(useRuntimeConfig().deferHydration))
  nitroApp.hooks.hook('render:html', (html: HtmlParts) => {
    deferModuleGraph(html, { full })
  })
})
