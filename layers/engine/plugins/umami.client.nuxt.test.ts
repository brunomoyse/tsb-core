// Umami plugin: injects the analytics script only when both the website id and the host are configured.
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const useHead = vi.hoisted(() => vi.fn())
const publicConfig = vi.hoisted(() => ({ umamiWebsiteId: '' as unknown, umamiHost: '' as unknown }))
mockNuxtImport('useHead', () => useHead)
mockNuxtImport('useRuntimeConfig', (original) => () => ({
  ...original(),
  public: { ...original().public, ...publicConfig },
}))

const { default: plugin } = await import('./umami.client')
const run = () => {
  ;(plugin as unknown as () => void)()
}

beforeEach(() => {
  useHead.mockReset()
  publicConfig.umamiWebsiteId = ''
  publicConfig.umamiHost = ''
})

describe('umami plugin', () => {
  it('adds the deferred script of the configured host with the website id', () => {
    publicConfig.umamiWebsiteId = 'site-123'
    publicConfig.umamiHost = 'https://stats.example.test'
    run()
    expect(useHead).toHaveBeenCalledExactlyOnceWith({
      script: [
        {
          src: 'https://stats.example.test/script.js',
          async: true,
          defer: true,
          'data-website-id': 'site-123',
        },
      ],
    })
  })

  it('adds nothing without a website id', () => {
    publicConfig.umamiHost = 'https://stats.example.test'
    run()
    expect(useHead).not.toHaveBeenCalled()
  })

  it('adds nothing without a host', () => {
    publicConfig.umamiWebsiteId = 'site-123'
    run()
    expect(useHead).not.toHaveBeenCalled()
  })
})
