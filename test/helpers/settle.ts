// "Everything that was going to happen has happened": the lazy `import()`s the code under test started have loaded
// (`vi.dynamicImportSettled`) and the promise chains behind them have run (a macrotask boundary). It is not a delay, so
// it cannot be too short on a slow machine: use it before asserting that something did NOT happen.
import { flushPromises } from '@vue/test-utils'
import { vi } from 'vite-plus/test'

export async function settle(): Promise<void> {
  await vi.dynamicImportSettled()
  await flushPromises()
}
