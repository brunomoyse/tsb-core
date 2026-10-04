// useCouponCode: applying / removing a promo code on the cart. `apply` returns null on success, else the translated
// reason the code was refused; a request that FAILED never says "invalid code". The GraphQL transport is the boundary.
// Run: `vp test run layers/engine/composables/useCouponCode.nuxt.test.ts`.
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { useCartStore } from '#engine/stores/cart'
import { makeProduct } from '../../../test/fixtures/catalog'

const reportError = vi.hoisted(() => vi.fn())
const gqlFetch = vi.hoisted(() => vi.fn())
mockNuxtImport('useNuxtApp', async (original) => {
  const { withGqlFetch } = await import('../../../test/helpers/gqlFetch')
  return () => withGqlFetch(original(), gqlFetch)
})
vi.mock('#engine/utils/reportError', () => ({ reportError }))
vi.mock('vue-i18n', async (importOriginal) => {
  const { fakeI18n } = await import('../../../test/helpers/i18n')
  return { ...(await importOriginal<typeof import('vue-i18n')>()), useI18n: fakeI18n }
})

let cart: ReturnType<typeof useCartStore>

/** The module remembers that an old backend has no `errorCode`: every test starts from a fresh one. */
const load = async () => {
  vi.resetModules()
  const { useCouponCode } = await import('#engine/composables/useCouponCode')
  // The error class of the same module graph as the composable (`instanceof` is how errors are recognised).
  const { GqlError } = await import('#engine/utils/gqlError')
  return {
    ...useCouponCode(),
    offline: () => GqlError.fromTransport(new TypeError('Failed to fetch')),
    http: (status: number) => GqlError.fromTransport({ status, message: 'HTTP error' }),
    graphql: (message: string, code: string) => new GqlError([{ message, extensions: { code } }]),
    legacyFieldError: () =>
      new GqlError([
        {
          message: 'Cannot query field "errorCode" on type "CouponValidation".',
          extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
        },
      ]),
  }
}

const validation = (overrides: Record<string, unknown> = {}) => ({
  validateCoupon: {
    valid: true,
    discountAmount: '2.50',
    errorMessage: null,
    errorCode: null,
    ...overrides,
  },
})
const queryOf = (call: number) => gqlFetch.mock.calls[call]![0] as string
const variablesOf = (call: number) =>
  (gqlFetch.mock.calls[call]![1] as { variables: Record<string, unknown> }).variables

beforeEach(() => {
  setActivePinia(createPinia())
  cart = useCartStore()
  cart.addProduct(makeProduct({ price: '10.00' }), 3)
  gqlFetch.mockReset()
  reportError.mockReset()
})

describe('apply', () => {
  it('a valid code goes on the cart with its discount, and apply returns null', async () => {
    gqlFetch.mockResolvedValue(validation({ discountAmount: '2.50' }))
    const { apply } = await load()
    expect(await apply('WELCOME')).toBeNull()
    expect(cart.couponCode).toBe('WELCOME')
    expect(cart.couponDiscountCents).toBe(250)
  })

  it('asks the server about the code against the goods subtotal in euros', async () => {
    gqlFetch.mockResolvedValue(validation())
    const { apply } = await load()
    await apply('WELCOME')
    expect(gqlFetch).toHaveBeenCalledOnce()
    expect(queryOf(0)).toContain('errorCode')
    expect(variablesOf(0)).toEqual({ code: 'WELCOME', orderAmount: '30.00' })
  })

  it('trims what the customer typed, and a blank field is not a request', async () => {
    gqlFetch.mockResolvedValue(validation())
    const { apply } = await load()
    expect(await apply('   ')).toBeNull()
    expect(await apply('')).toBeNull()
    expect(gqlFetch).not.toHaveBeenCalled()
    expect(cart.couponCode).toBeNull()
    await apply('  WELCOME ')
    expect(variablesOf(0).code).toBe('WELCOME')
    expect(cart.couponCode).toBe('WELCOME')
  })

  it.each([
    ['COUPON_INVALID', 'coupon.invalid'],
    ['COUPON_EXHAUSTED', 'coupon.invalid'],
    ['COUPON_MIN_ORDER_NOT_MET', 'notify.errors.couponMinOrderNotMet'],
    ['COUPON_ALREADY_ACTIVE', 'notify.errors.couponAlreadyActive'],
    ['COUPON_RATE_LIMITED', 'notify.errors.tooManyRequests'],
    ['COUPON_CHECK_FAILED', 'notify.errors.couponCheckFailed'],
    ['COUPON_RESERVE_FAILED', 'notify.errors.orderCreationFailed'],
  ])(
    'a code the server refuses with %s is shown as %s, and nothing goes on the cart',
    async (errorCode, key) => {
      gqlFetch.mockResolvedValue(validation({ valid: false, discountAmount: '0.00', errorCode }))
      const { apply } = await load()
      expect(await apply('NOPE')).toBe(key)
      expect(cart.couponCode).toBeNull()
      expect(cart.couponDiscountCents).toBe(0)
      expect(reportError).not.toHaveBeenCalled()
    },
  )

  it('a refusal without any usable code is simply "invalid code", never the backend English text', async () => {
    gqlFetch.mockResolvedValue(
      validation({ valid: false, errorCode: null, errorMessage: 'something unheard of' }),
    )
    const { apply } = await load()
    expect(await apply('NOPE')).toBe('coupon.invalid')
  })

  it('an old backend that only sends the English message is still understood', async () => {
    gqlFetch.mockResolvedValue(
      validation({
        valid: false,
        errorCode: null,
        errorMessage: 'you already have an active order using a coupon',
      }),
    )
    const { apply } = await load()
    expect(await apply('NOPE')).toBe('notify.errors.couponAlreadyActive')
  })

  it('a refused code leaves the coupon already on the cart untouched', async () => {
    cart.couponCode = 'OLD'
    cart.couponDiscountCents = 100
    gqlFetch.mockResolvedValue(validation({ valid: false, errorCode: 'COUPON_INVALID' }))
    const { apply } = await load()
    await apply('NEW')
    expect(cart.couponCode).toBe('OLD')
    expect(cart.couponDiscountCents).toBe(100)
  })
})

describe('a request that fails', () => {
  it('is reported, and shown as the generic "try again" rather than "invalid code"', async () => {
    const { apply, offline } = await load()
    const failure = offline()
    gqlFetch.mockRejectedValue(failure)
    const message = await apply('WELCOME')
    expect(message).toBe('notify.errors.networkError')
    expect(message).not.toBe('coupon.invalid')
    expect(reportError).toHaveBeenCalledWith(failure, 'coupon.validate')
    expect(cart.couponCode).toBeNull()
  })

  it('an HTTP 5xx is a server error', async () => {
    const { apply, http } = await load()
    gqlFetch.mockRejectedValue(http(503))
    expect(await apply('WELCOME')).toBe('notify.errors.serverError')
  })

  it('an error nobody can describe falls back to the generic request failure', async () => {
    gqlFetch.mockRejectedValue(new Error('boom'))
    const { apply } = await load()
    expect(await apply('WELCOME')).toBe('notify.errors.requestFailed')
    expect(reportError).toHaveBeenCalledOnce()
  })

  it('a GraphQL error with a known code is shown with its own message (the session expired)', async () => {
    const { apply, graphql } = await load()
    gqlFetch.mockRejectedValue(graphql('nope', 'UNAUTHENTICATED'))
    expect(await apply('WELCOME')).toBe('notify.errors.sessionExpired')
  })

  it('a validation error that is not about errorCode is NOT a reason to retry on the old query', async () => {
    const { apply, graphql } = await load()
    gqlFetch.mockRejectedValue(graphql('Cannot query field "other"', 'GRAPHQL_VALIDATION_FAILED'))
    await apply('WELCOME')
    expect(gqlFetch).toHaveBeenCalledOnce()
  })

  it('an errorCode complaint with another error code is not the rollout case either', async () => {
    const { apply, graphql } = await load()
    gqlFetch.mockRejectedValue(graphql('errorCode is wrong', 'INTERNAL'))
    await apply('WELCOME')
    expect(gqlFetch).toHaveBeenCalledOnce()
  })
})

describe('a backend from before errorCode existed (rollout fallback)', () => {
  it('retries once without the field, and the answer is used as usual', async () => {
    const { apply, legacyFieldError } = await load()
    gqlFetch.mockRejectedValueOnce(legacyFieldError())
    gqlFetch.mockResolvedValueOnce(validation({ discountAmount: '1.00' }))
    expect(await apply('WELCOME')).toBeNull()
    expect(gqlFetch).toHaveBeenCalledTimes(2)
    expect(queryOf(0)).toContain('errorCode')
    expect(queryOf(1)).not.toContain('errorCode')
    expect(variablesOf(1)).toEqual(variablesOf(0))
    expect(cart.couponDiscountCents).toBe(100)
    expect(reportError).not.toHaveBeenCalled()
  })

  it('remembers it: later attempts go straight to the old query', async () => {
    const { apply, legacyFieldError } = await load()
    gqlFetch.mockRejectedValueOnce(legacyFieldError())
    gqlFetch.mockResolvedValue(validation())
    await apply('ONE')
    gqlFetch.mockClear()
    await apply('TWO')
    expect(gqlFetch).toHaveBeenCalledOnce()
    expect(queryOf(0)).not.toContain('errorCode')
  })

  it('a refusal on the old query is judged by its English message', async () => {
    const { apply, legacyFieldError } = await load()
    gqlFetch.mockRejectedValueOnce(legacyFieldError())
    gqlFetch.mockResolvedValueOnce(
      validation({ valid: false, errorMessage: 'invalid coupon', errorCode: undefined }),
    )
    expect(await apply('NOPE')).toBe('coupon.invalid')
  })

  it('if the old query fails too, it is a failed request like any other', async () => {
    const { apply, legacyFieldError, offline } = await load()
    const failure = offline()
    gqlFetch.mockRejectedValueOnce(legacyFieldError())
    gqlFetch.mockRejectedValueOnce(failure)
    expect(await apply('WELCOME')).toBe('notify.errors.networkError')
    expect(reportError).toHaveBeenCalledWith(failure, 'coupon.validate')
  })
})

describe('remove', () => {
  it('takes the coupon and its discount off the cart', async () => {
    cart.couponCode = 'WELCOME'
    cart.couponDiscountCents = 250
    const { remove } = await load()
    remove()
    expect(cart.couponCode).toBeNull()
    expect(cart.couponDiscountCents).toBe(0)
  })
})
