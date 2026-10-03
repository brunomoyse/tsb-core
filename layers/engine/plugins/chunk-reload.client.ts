import { isChunkLoadError } from '#engine/utils/chunkError'
import { joinURL } from 'ufo'

/*
 * Recovers from lazy chunks that failed to load (see utils/chunkError.ts). Nuxt's own chunk-reload
 * plugin only reloads when the failure happens during a route navigation; a lazy component on
 * the current page failing to load surfaces as an unhandled Vue error instead and leaves the
 * page broken. Reload the current route (onto the current build, if one was deployed).
 * reloadNuxtApp guards against loops (one reload per path per 10s, tracked in sessionStorage).
 */
export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const router = useRouter()

  const reloadOnChunkError = (error: unknown) => {
    if (!isChunkLoadError(error)) return
    reloadNuxtApp({
      path: joinURL(config.app.baseURL, router.currentRoute.value.fullPath),
      persistState: true,
    })
  }

  nuxtApp.hook('vue:error', reloadOnChunkError)
  nuxtApp.hook('app:error', reloadOnChunkError)
  nuxtApp.hook('app:chunkError', ({ error }) => {
    reloadOnChunkError(error)
  })
})
