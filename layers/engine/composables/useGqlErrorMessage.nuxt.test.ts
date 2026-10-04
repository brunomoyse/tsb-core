// UseGqlErrorMessage: the translated text of a failed GraphQL call. The backend's `extensions.code` picks the message,
// Anything unknown shows the caller's generic key (the raw backend message is never displayed), and the numbers the
// Message quotes come from the live ordering policy. vue-i18n's `t` is the boundary, replaced by one that echoes
// Its key and parameters; the error table, the policy and the restaurant config state are real.
// Run: `vp test run layers/engine/composables/useGqlErrorMessage.nuxt.test.ts`.
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { GQL_HTTP_ERROR, GQL_NETWORK_ERROR, GqlError } from '#engine/utils/gqlError'
import { useRestaurantConfigState } from './useRestaurantConfig'

const t = vi.hoisted(() =>
  vi.fn(
    (key: string, params?: Record<string, unknown>) => `${key}|${JSON.stringify(params ?? {})}`,
  ),
)
vi.mock('vue-i18n', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-i18n')>()),
  useI18n: () => ({ t }),
}))

const { useGqlErrorMessage } = await import('./useGqlErrorMessage')

const coded = (code: string, extensions: Record<string, unknown> = {}) =>
  new GqlError([{ message: 'backend wording', extensions: { code, ...extensions } }])

beforeEach(() => {
  t.mockClear()
  useRestaurantConfigState().value = null
})

describe('a known backend code', () => {
  it('shows the message of that code, never the backend wording', () => {
    const message = useGqlErrorMessage()
    expect(message(coded('PRICE_CHANGED'))).toBe('notify.errors.priceChanged|{}')
    expect(t).toHaveBeenCalledExactlyOnceWith('notify.errors.priceChanged', {})
  })

  it('asks the customer to sign in again when the session is gone', () => {
    expect(useGqlErrorMessage()(coded('UNAUTHENTICATED'))).toBe('notify.errors.sessionExpired|{}')
  })

  it('names the product when the caller supplies its name in the context', () => {
    const message = useGqlErrorMessage()
    message(coded('PRODUCT_UNAVAILABLE'), undefined, { productName: 'Salmon nigiri' })
    expect(t).toHaveBeenCalledExactlyOnceWith('notify.errors.productUnavailableNamed', {
      name: 'Salmon nigiri',
    })
  })

  it('quotes the minimum the backend sent for a delivery below the minimum', () => {
    useGqlErrorMessage()(coded('DELIVERY_MINIMUM_NOT_MET', { minimum: '30' }))
    expect(t).toHaveBeenCalledExactlyOnceWith('cart.minimumDelivery', { amount: 30 })
  })

  it('recognises an old backend by the wording of its error when it sends no code', () => {
    const legacy = new GqlError([{ message: 'order must contain at least one item' }])
    expect(useGqlErrorMessage()(legacy)).toBe('notify.errors.cartEmpty|{}')
  })

  it('explains a dropped connection and a throttled or failing API', () => {
    const message = useGqlErrorMessage()
    expect(message(new GqlError([{ message: 'x', extensions: { code: GQL_NETWORK_ERROR } }]))).toBe(
      'notify.errors.networkError|{}',
    )
    const http = (status: number) =>
      new GqlError([{ message: 'x', extensions: { code: GQL_HTTP_ERROR } }], { status })
    expect(message(http(429))).toBe('notify.errors.tooManyRequests|{}')
    expect(message(http(503))).toBe('notify.errors.serverError|{}')
  })
})

describe('the numbers come from the live ordering policy', () => {
  it('quotes the delivery minimum and radius of the config once it has loaded', () => {
    const message = useGqlErrorMessage()
    message(coded('DELIVERY_MINIMUM_NOT_MET'))
    message(coded('DELIVERY_OUT_OF_ZONE'))
    expect(t.mock.calls).toEqual([
      ['cart.minimumDelivery', { amount: 25 }],
      ['notify.errors.deliveryAddressTooFar', { distance: 9 }],
    ])

    t.mockClear()
    useRestaurantConfigState().value = {
      restaurantConfig: {
        policy: {
          deliveryEnabled: true,
          deliveryMinimum: '40.00',
          deliveryMaxDistanceKm: 12,
          deliveryFeeTiers: [{ upToKm: 12, fee: '0.00' }],
          excludedPostcodes: [],
          pickupDiscountRate: 0.1,
          pickupDiscountMinimum: '20.00',
          onlinePaymentFee: '0.30',
          totalRoundingStep: '0.10',
          slotIntervalMinutes: 15,
          minimumPreparationMinutes: 15,
        },
      },
    } as never
    message(coded('DELIVERY_MINIMUM_NOT_MET'))
    message(coded('DELIVERY_OUT_OF_ZONE'))
    expect(t.mock.calls).toEqual([
      ['cart.minimumDelivery', { amount: 40 }],
      ['notify.errors.deliveryAddressTooFar', { distance: 12 }],
    ])
  })
})

describe('an error nothing specific is known about', () => {
  it.each([
    ['an unknown code', coded('SOMETHING_NEW')],
    ['an HTTP 4xx other than 429', new GqlError([{ message: 'x' }], { status: 404 })],
    ['a plain Error', new Error('boom')],
    ['a thrown string', 'boom'],
    ['nothing', undefined],
  ])('shows the default generic message for %s', (_label, err) => {
    expect(useGqlErrorMessage()(err)).toBe('notify.errors.requestFailed|{}')
  })

  it('shows the generic message the caller gives for its own action', () => {
    expect(useGqlErrorMessage()(new Error('boom'), 'notify.errors.orderCreationFailed')).toBe(
      'notify.errors.orderCreationFailed|{}',
    )
    expect(t).toHaveBeenCalledExactlyOnceWith('notify.errors.orderCreationFailed')
  })
})
