// Unit tests never reach the network (Mollie, Zitadel, the API, S3...): an HTTP call that a test did not mock fails
// loudly instead of going out. Calls to the local machine stay possible (registerEndpoint, local mock servers).
//
// `fetch` and `$fetch` are both wrapped: the Nuxt test environment builds its `$fetch` before the setup files run, on
// the fetch it found at that time, so wrapping `fetch` alone would not cover `$fetch`.
import { createFetch } from 'ofetch'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

function guard(realFetch: typeof fetch): typeof fetch {
  return (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' || input instanceof URL ? String(input) : input.url
    const url = new URL(raw, 'http://localhost')
    if (url.protocol.startsWith('http') && !LOCAL_HOSTS.has(url.hostname)) {
      const method =
        init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET')
      return Promise.reject(
        new Error(`Unmocked network request blocked in unit tests: ${method} ${url.href}`),
      )
    }
    return realFetch(input, init)
  }
}

globalThis.fetch = guard(globalThis.fetch)
const scope = globalThis as unknown as { $fetch?: unknown }
if (scope.$fetch) scope.$fetch = createFetch({ fetch: globalThis.fetch })
