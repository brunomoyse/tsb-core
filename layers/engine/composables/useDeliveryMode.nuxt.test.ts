// UseDeliveryMode: home delivery is offered only when the brand flag AND the API's delivery policy both say so.
// Both brands: tokyosushi offers delivery, ygfliege is takeaway-only (`deliveryEnabled: false`).
// Run: `vp test run layers/engine/composables/useDeliveryMode.nuxt.test.ts`.
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { useRestaurantConfigState } from '#engine/composables/useRestaurantConfig'
import type { ApiOrderingPolicy } from '#engine/utils/orderingPolicy'
import { brand as tokyosushi } from '#brand/brand'

// `undefined` = the brand does not set the flag at all.
const brandFlag = vi.hoisted(() => ({ value: undefined as boolean | undefined }))
mockNuxtImport('useAppConfig', (original) => () => {
  const config = original()
  return { ...config, brand: { ...config.brand, deliveryEnabled: brandFlag.value } }
})

const { useDeliveryMode } = await import('#engine/composables/useDeliveryMode')

const serve = (deliveryEnabled: boolean | undefined) => {
  useRestaurantConfigState().value =
    deliveryEnabled === undefined
      ? null
      : ({
          restaurantConfig: { policy: { deliveryEnabled } as ApiOrderingPolicy },
        } as unknown as ReturnType<typeof useRestaurantConfigState>['value'])
}

beforeEach(() => {
  brandFlag.value = undefined
  serve(undefined)
})

describe('useDeliveryMode', () => {
  it('the tokyosushi brand does not turn delivery off', () => {
    expect(tokyosushi.deliveryEnabled).not.toBe(false)
  })

  it('is on by default: a brand without the flag, and a config that has not loaded', () => {
    expect(useDeliveryMode().deliveryEnabled.value).toBe(true)
  })

  it('is off when the brand is takeaway-only, whatever the API says (ygfliege)', () => {
    brandFlag.value = false
    expect(useDeliveryMode().deliveryEnabled.value).toBe(false)
    serve(true)
    expect(useDeliveryMode().deliveryEnabled.value).toBe(false)
  })

  it('is off when the API policy switches delivery off (the backend refuses DELIVERY_UNAVAILABLE)', () => {
    brandFlag.value = true
    serve(false)
    expect(useDeliveryMode().deliveryEnabled.value).toBe(false)
  })

  it('is on only with both switches on, and follows the live policy', () => {
    brandFlag.value = true
    serve(true)
    const { deliveryEnabled } = useDeliveryMode()
    expect(deliveryEnabled.value).toBe(true)
    serve(false)
    expect(deliveryEnabled.value).toBe(false)
    serve(true)
    expect(deliveryEnabled.value).toBe(true)
  })
})
