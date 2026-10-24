// Moves the vite-plus pins of package.json (see vite-plus-pins.mjs). Run by .github/workflows/dependabot-vite-plus.yml;
// prints `changed` or `unchanged`.
import { readFileSync, writeFileSync } from 'node:fs'
import { syncedPins } from './vite-plus-pins.mjs'

const pkgPath = new URL('../package.json', import.meta.url)
const text = readFileSync(pkgPath, 'utf8')
const synced = syncedPins(
  text,
  readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'),
)
if (synced === text) {
  console.log('unchanged')
} else {
  writeFileSync(pkgPath, synced)
  console.log('changed')
}
