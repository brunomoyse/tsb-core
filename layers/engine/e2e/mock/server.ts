import { createMockServer } from './http.ts'

/*
 * Entry point: `node layers/engine/e2e/mock/server.ts` (Node 22.18+ runs TypeScript directly).
 *
 *   MOCK_BRAND    tokyosushi | ygfliege                   (required)
 *   MOCK_PORT     port to listen on                       (required)
 *   MOCK_APP_URL  origin of the web app under test, only the fallback of the fake Mollie's redirect
 *   MOCK_LATENCY_MS  fixed latency on every GraphQL request (default 0)
 */
const brand = process.env.MOCK_BRAND
if (brand !== 'tokyosushi' && brand !== 'ygfliege') {
  console.error('MOCK_BRAND must be tokyosushi or ygfliege')
  process.exit(1)
}
const port = Number(process.env.MOCK_PORT)
if (!Number.isInteger(port) || port <= 0) {
  console.error('MOCK_PORT must be a port number')
  process.exit(1)
}

const mock = await createMockServer({
  brand,
  port,
  appUrl: process.env.MOCK_APP_URL ?? 'http://localhost:3000',
})
console.log(`[mock] ${brand} listening on ${mock.url}`)

const stop = () => {
  void mock.close().then(() => process.exit(0))
}
process.on('SIGTERM', stop)
process.on('SIGINT', stop)
