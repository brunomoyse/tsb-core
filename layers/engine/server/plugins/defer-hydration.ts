import { type HtmlParts, deferModuleGraph } from '../../utils/deferHydration'
import { defineNitroPlugin } from 'nitropack/runtime'

// Production only: the dev server serves modules in its own way (see utils/deferHydration.ts for what this does).
export default defineNitroPlugin((nitroApp) => {
  if (import.meta.dev) return
  nitroApp.hooks.hook('render:html', (html: HtmlParts) => {
    deferModuleGraph(html)
  })
})
