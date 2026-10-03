/*
 * Errors a browser raises when a lazily imported chunk fails to load: a tab still running the
 * previous release after a deploy replaced the hashed `/_nuxt/*.js` files, or a connection that
 * dropped mid-fetch (WebKit, so every iOS browser, reports both the same way). Wording per engine:
 * WebKit "Importing a module script failed", Chromium "Failed to fetch dynamically imported
 * module", Firefox "error loading dynamically imported module", Vite "Unable to preload CSS".
 */
const CHUNK_ERROR_PATTERN =
  /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Unable to preload CSS/iu

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  return CHUNK_ERROR_PATTERN.test(message)
}
