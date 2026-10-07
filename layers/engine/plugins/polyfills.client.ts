import { installPolyfills } from '#engine/utils/polyfills'

/*
 * The recent built-ins older phones lack (see utils/polyfills.ts), added before anything else runs: `order: -50` puts
 * this plugin ahead of every other one, Sentry's included (-40), and the app renders only after the plugins.
 */
export default defineNuxtPlugin({
  name: 'polyfills',
  order: -50,
  setup() {
    installPolyfills()
  },
})
