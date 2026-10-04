/*
 * The few parts of the Sentry SDK the shop uses, named one by one. `startSentry` loads THIS file lazily (sentryClient.ts)
 * rather than `@sentry/nuxt` itself: importing a whole package with `import()` makes the bundler keep every export of it
 * (session replay, the feedback widget, canvas recording: ~500 KB that a page would download for nothing), while named
 * re-exports let it keep only what these reach.
 */
export {
  browserTracingIntegration,
  captureException,
  getActiveSpan,
  getClient,
  getRootSpan,
  init,
  spanToJSON,
  updateSpanName,
} from '@sentry/nuxt'
