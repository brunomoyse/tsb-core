// useOrderingPolicy: the backend's ordering rules read from the shared restaurant config, with the default policy until
// the config has loaded or for a backend that has no `policy` yet; plus the numbers the copy quotes.
// Run: `vp test run layers/engine/composables/useOrderingPolicy.nuxt.test.ts`.
import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { type ApiOrderingPolicy, DEFAULT_ORDERING_POLICY } from '#engine/utils/orderingPolicy'
import { useOrderingPolicy } from '#engine/composables/useOrderingPolicy'
import { useRestaurantConfigState } from '#engine/composables/useRestaurantConfig'
import type { RestaurantConfig } from '#engine/composables/useRestaurantConfig'

const apiPolicy = (overrides: Partial<ApiOrderingPolicy> = {}): ApiOrderingPolicy => ({
  deliveryEnabled: true,
  deliveryMinimum: '30.00',
  deliveryMaxDistanceKm: 7,
  deliveryFeeTiers: [
    { upToKm: 4, fee: '0.00' },
    { upToKm: 7, fee: '2.50' },
  ],
  excludedPostcodes: ['4000'],
  pickupDiscountRate: 0.15,
  pickupDiscountMinimum: '12.50',
  onlinePaymentFee: '0.50',
  totalRoundingStep: '0.05',
  slotIntervalMinutes: 10,
  minimumPreparationMinutes: 20,
  ...overrides,
})

const config = (policy?: ApiOrderingPolicy): { restaurantConfig: RestaurantConfig } => ({
  restaurantConfig: {
    orderingEnabled: true,
    openingHours: {},
    orderingHours: null,
    preparationMinutes: 15,
    isCurrentlyOpen: true,
    isOrderingCurrentlyOpen: true,
    availableSlotsToday: [],
    nextOpeningAt: null,
    ...(policy ? { policy } : {}),
  },
})

beforeEach(() => {
  useRestaurantConfigState().value = null
})

describe('useOrderingPolicy', () => {
  it('is the default policy until the config has loaded', () => {
    const { policy, policyParams } = useOrderingPolicy()
    expect(policy.value).toEqual(DEFAULT_ORDERING_POLICY)
    expect(policyParams.value).toEqual({
      rate: 10,
      pickupMinimum: 20,
      deliveryMinimum: 25,
      distance: 9,
    })
  })

  it('is the default policy for a backend whose config has no policy field', () => {
    useRestaurantConfigState().value = config()
    expect(useOrderingPolicy().policy.value).toEqual(DEFAULT_ORDERING_POLICY)
  })

  it('reads the policy of the config in integers (cents, meters, basis points)', () => {
    useRestaurantConfigState().value = config(apiPolicy())
    const { policy } = useOrderingPolicy()
    expect(policy.value).toMatchObject({
      deliveryMinimumCents: 3000,
      deliveryMaxMeters: 7000,
      deliveryFeeTiers: [
        { upToMeters: 4000, feeCents: 0 },
        { upToMeters: 7000, feeCents: 250 },
      ],
      excludedPostcodes: ['4000'],
      pickupDiscountRateBp: 1500,
      pickupDiscountMinimumCents: 1250,
      onlinePaymentFeeCents: 50,
      totalRoundingStepCents: 5,
      slotIntervalMinutes: 10,
      minimumPreparationMinutes: 20,
    })
  })

  it('the numbers of the copy follow the policy (never typed into a locale file)', () => {
    useRestaurantConfigState().value = config(apiPolicy())
    expect(useOrderingPolicy().policyParams.value).toEqual({
      rate: 15,
      pickupMinimum: 12.5,
      deliveryMinimum: 30,
      distance: 7,
    })
  })

  it('follows a live change of the config (the restaurantConfigUpdated feed) on an open page', () => {
    const state = useRestaurantConfigState()
    state.value = config(apiPolicy())
    const { policy } = useOrderingPolicy()
    expect(policy.value.deliveryMinimumCents).toBe(3000)
    state.value = config(apiPolicy({ deliveryMinimum: '40.00' }))
    expect(policy.value.deliveryMinimumCents).toBe(4000)
    state.value = null
    expect(policy.value).toEqual(DEFAULT_ORDERING_POLICY)
  })

  it('a malformed field falls back alone: the rest of the served policy is kept', () => {
    useRestaurantConfigState().value = config(apiPolicy({ deliveryMinimum: 'abc' }))
    const { policy } = useOrderingPolicy()
    expect(policy.value.deliveryMinimumCents).toBe(DEFAULT_ORDERING_POLICY.deliveryMinimumCents)
    expect(policy.value.onlinePaymentFeeCents).toBe(50)
  })
})
