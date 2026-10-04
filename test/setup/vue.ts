// Every component a test mounts (`mount`, withSetup, mountComposable) is unmounted after the test: its lifecycle hooks,
// watchers and the module-level state of composables (scroll-lock counters, sticky heights...) must not leak into the next.
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach } from 'vite-plus/test'

enableAutoUnmount(afterEach)
