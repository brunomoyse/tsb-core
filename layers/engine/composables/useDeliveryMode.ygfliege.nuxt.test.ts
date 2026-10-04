// useDeliveryMode in the real app of ygfliege: a takeaway-only brand (`deliveryEnabled: false`), whatever the API says.
// Run: `vp test run layers/engine/composables/useDeliveryMode.ygfliege.nuxt.test.ts`.
import { beforeEach, describe, expect, it } from 'vite-plus/test'
import type { ApiOrderingPolicy } from '#engine/utils/orderingPolicy'
import { useAppConfig } from '#imports'
import { useDeliveryMode } from '#engine/composables/useDeliveryMode'
import { useRestaurantConfigState } from '#engine/composables/useRestaurantConfig'

const serve = (deliveryEnabled: boolean | undefined) => {
  useRestaurantConfigState().value =
    deliveryEnabled === undefined
      ? null
      : ({
          restaurantConfig: { policy: { deliveryEnabled } as ApiOrderingPolicy },
        } as unknown as ReturnType<typeof useRestaurantConfigState>['value'])
}

beforeEach(() => {
  serve(undefined)
})

describe('useDeliveryMode in the ygfliege app', () => {
  it('runs in the ygfliege app, whose brand is takeaway-only', () => {
    expect(useAppConfig().brand.name).toBe('Yangguofu Malatang Liège')
    expect(useAppConfig().brand.deliveryEnabled).toBe(false)
  })

  it('offers no delivery before the config has loaded, nor when the API allows it', () => {
    const { deliveryEnabled } = useDeliveryMode()
    expect(deliveryEnabled.value).toBe(false)
    serve(true)
    expect(deliveryEnabled.value).toBe(false)
  })
})
