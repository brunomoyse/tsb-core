/**
 * Extract the SPA shell HTML from the Nitro server build.
 *
 * With ssr:false, `nuxt build` produces a Nitro server that generates the
 * SPA shell at runtime — there's no static index.html. Capacitor needs one,
 * so we start the server briefly, fetch the shell, and save it.
 */

import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { writeFileSync } from 'node:fs'

const PORT = 3199
const serverEntry = resolve('.output/server/index.mjs')
const outputPath = resolve('.output/public/index.html')

console.log('Starting Nitro server to extract SPA shell...')

const server = spawn('node', [serverEntry], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
})

// Wait for server to be ready
await new Promise((resolve) => {
  server.stdout.on('data', (data) => {
    if (data.toString().includes('Listening')) resolve()
  })
  setTimeout(resolve, 3000) // fallback timeout
})

try {
  const res = await fetch(`http://localhost:${PORT}/fr`)
  const html = await res.text()
  writeFileSync(outputPath, html)
  console.log(`SPA shell saved to .output/public/index.html (${html.length} bytes)`)
} finally {
  server.kill()
}
