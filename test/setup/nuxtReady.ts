// The booted Nuxt app runs deferred work after it is ready (plugins on `onNuxtReady`, e.g. auth-sync, which reads
// the Pinia stores and may clear the signed-in user). Without this, that work would land in whichever test happens to
// be running when the browser is idle: a flaky wipe of a test's own state. Let the boot finish before the first test
// of a file runs (a beforeEach, because the app itself is only set up in a beforeAll that runs after the setup files).
import { beforeEach } from 'vite-plus/test'
import { onNuxtReady } from 'nuxt/app'
import { settle } from '../helpers/settle'

let ready = false

beforeEach(async () => {
  if (ready) return
  ready = true
  await new Promise<void>((resolve) => {
    onNuxtReady(resolve)
  })
  await settle()
})
