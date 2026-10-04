// Middleware: preload-messages.global.ts — the page's language file is asked for while the HTML is parsed.
import { defineNuxtRouteMiddleware, useHead, useRuntimeConfig } from '#imports'

/*
 * The messages of a language are one static, hashed JSON file (build/i18n-messages.ts) that the language module fetches
 * once the page's JavaScript runs: a round-trip that starts only after the bundle has been downloaded and parsed. Linked
 * from the HTML head it is on its way from the first byte, and the module's fetch() picks the preloaded answer up
 * (same URL, `crossorigin` = a CORS-mode fetch without credentials, as the module's own).
 *
 * The language is the one in the URL (`/fr/...`): a request the module redirects to another language is answered by
 * a redirect, no HTML is sent. Server render only, and not in dev (there the files come from the module's loaders).
 */
export default defineNuxtRouteMiddleware((to) => {
  if (!import.meta.server || import.meta.dev) return
  const urls = useRuntimeConfig().tsbI18nMessageUrls
  const href = urls[to.path.split('/')[1] ?? '']
  if (href === undefined) return
  useHead({
    link: [{ key: 'i18n-messages', rel: 'preload', as: 'fetch', href, crossorigin: 'anonymous' }],
  })
})
