// Chunk-reload plugin: a lazy chunk that fails to load reloads the current route (once per the guard of reloadNuxtApp).
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const reloadNuxtApp = vi.hoisted(() => vi.fn())
const route = vi.hoisted(() => ({ fullPath: '/fr/menu?x=1' }))
mockNuxtImport('reloadNuxtApp', () => reloadNuxtApp)
// The real router (Nuxt itself uses it), only the current route is the test's.
mockNuxtImport('useRouter', (original) => () => {
  const router = original()
  return new Proxy(router, {
    get: (target, key) => (key === 'currentRoute' ? { value: route } : Reflect.get(target, key)),
  })
})

const { default: plugin } = await import('./chunk-reload.client')

type Hook = (payload: unknown) => void
function install() {
  const hooks = new Map<string, Hook>()
  ;(plugin as unknown as (app: { hook: (name: string, fn: Hook) => void }) => void)({
    hook: (name, fn) => hooks.set(name, fn),
  })
  return hooks
}

const chunkError = () => new Error('Failed to fetch dynamically imported module: /_nuxt/Cart.js')

beforeEach(() => {
  reloadNuxtApp.mockReset()
  route.fullPath = '/fr/menu?x=1'
})

describe('chunk-reload plugin', () => {
  it('listens to vue errors, app errors and the chunk error hook', () => {
    expect([...install().keys()].sort()).toEqual(['app:chunkError', 'app:error', 'vue:error'])
  })

  it.each(['vue:error', 'app:error'])(
    '%s with a chunk error reloads the current route, keeping state',
    (hook) => {
      install().get(hook)!(chunkError())
      expect(reloadNuxtApp).toHaveBeenCalledExactlyOnceWith({
        path: '/fr/menu?x=1',
        persistState: true,
      })
    },
  )

  it('app:chunkError unwraps the error from its payload', () => {
    install().get('app:chunkError')!({ error: chunkError() })
    expect(reloadNuxtApp).toHaveBeenCalledOnce()
  })

  it('reloads the route the visitor is on now, not the one at install time', () => {
    const hooks = install()
    route.fullPath = '/fr/cart'
    hooks.get('vue:error')!(chunkError())
    expect(reloadNuxtApp.mock.calls[0]![0].path).toBe('/fr/cart')
  })

  it.each([new Error('boom'), 'TypeError: x is undefined', null, 42])(
    'ignores an error that is not a chunk failure (%s)',
    (error) => {
      const hooks = install()
      hooks.get('vue:error')!(error)
      hooks.get('app:chunkError')!({ error })
      expect(reloadNuxtApp).not.toHaveBeenCalled()
    },
  )
})
