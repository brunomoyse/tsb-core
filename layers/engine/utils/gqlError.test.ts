// GqlError and its helpers: the one error type of every GraphQL call (gqlFetch, useGqlQuery, useGqlMutation, subscriptions).
// Complements gqlErrors.test.mjs (code table, Sentry filter) with the construction rules and the odd inputs of transports.
// Run: `vp test run layers/engine/utils/gqlError.test.ts`.
import { describe, expect, it } from 'vite-plus/test'
import {
  GQL_HTTP_ERROR,
  GQL_NETWORK_ERROR,
  GqlError,
  isGqlError,
  isReportableError,
  toGqlError,
  unwrapGqlError,
} from './gqlError.ts'
import { DEFAULT_ORDERING_POLICY } from './orderingPolicy.ts'
import { describeCouponRefusal, describeGqlError } from './gqlErrors.ts'

describe('GqlError', () => {
  it('has a generic message, no code and empty extensions when the response carried no error entry', () => {
    const error = new GqlError([])
    expect(error.message).toBe('GraphQL request failed')
    expect(error.code).toBeNull()
    expect(error.extensions).toEqual({})
    expect(error.errors).toEqual([])
    expect(error.operationName).toBeNull()
    expect(error.status).toBeNull()
  })

  it('takes message, code and extensions from the first error, and ignores a code that is not a string', () => {
    const error = new GqlError([
      { message: 'first', extensions: { code: 42, field: 'x' } },
      { message: 'second', extensions: { code: 'SECOND' } },
    ])
    expect(error.message).toBe('first')
    expect(error.code).toBeNull()
    expect(error.extensions).toEqual({ code: 42, field: 'x' })
    // HasCode looks at every entry, `code` only at the first.
    expect(error.hasCode('SECOND')).toBe(true)
    expect(error.hasCode('MISSING')).toBe(false)
  })

  it('keeps the cause, operation name and status it is given', () => {
    const cause = new Error('socket hang up')
    const error = new GqlError([{ message: 'x' }], { cause, operationName: 'Op', status: 502 })
    expect(error.cause).toBe(cause)
    expect(error.operationName).toBe('Op')
    expect(error.status).toBe(502)
    expect(error).toBeInstanceOf(GqlError)
    expect(isGqlError(error)).toBe(true)
    expect(isGqlError(new Error('x'))).toBe(false)
    expect(isGqlError(null)).toBe(false)
  })
})

describe('GqlError.fromTransport', () => {
  it('keeps the GraphQL errors of a failed HTTP answer, dropping entries that are not errors', () => {
    const error = GqlError.fromTransport(
      {
        status: 422,
        message: '422 Unprocessable',
        data: {
          errors: [
            {
              message: 'unknown field',
              path: ['a', 0],
              extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
            },
            { message: 'plain' },
            { message: 12 },
            null,
            'text',
          ],
        },
      },
      'Op',
    )
    expect(error.errors).toEqual([
      {
        message: 'unknown field',
        path: ['a', 0],
        extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
      },
      { message: 'plain' },
    ])
    expect(error).toMatchObject({
      code: 'GRAPHQL_VALIDATION_FAILED',
      status: 422,
      operationName: 'Op',
    })
  })

  it('reads the status from `status` or `statusCode`, and says HTTP_ERROR for either', () => {
    expect(GqlError.fromTransport({ statusCode: 503, message: 'down' })).toMatchObject({
      code: GQL_HTTP_ERROR,
      status: 503,
      message: 'down',
    })
    expect(GqlError.fromTransport({ status: 500 })).toMatchObject({
      code: GQL_HTTP_ERROR,
      message: 'Request failed',
    })
  })

  it('says NETWORK_ERROR when there is no status (a dropped connection), whatever the input', () => {
    for (const input of [
      new TypeError('fetch failed'),
      null,
      undefined,
      { data: { errors: 'no' } },
    ]) {
      expect(GqlError.fromTransport(input)).toMatchObject({ code: GQL_NETWORK_ERROR, status: null })
    }
    expect(GqlError.fromTransport(null).message).toBe('Request failed')
  })

  it('keeps the original error as the cause', () => {
    const original = new TypeError('fetch failed')
    expect(GqlError.fromTransport(original).cause).toBe(original)
  })
})

describe('unwrapGqlError', () => {
  const gql = new GqlError([{ message: 'x' }])

  it('finds the GqlError itself, or behind up to two causes (Nuxt wraps what a handler throws)', () => {
    expect(unwrapGqlError(gql)).toBe(gql)
    expect(unwrapGqlError({ cause: gql })).toBe(gql)
    expect(unwrapGqlError({ cause: { cause: gql } })).toBe(gql)
  })

  it('gives up beyond that, and for anything that is not an error chain', () => {
    expect(unwrapGqlError({ cause: { cause: { cause: gql } } })).toBeNull()
    expect(unwrapGqlError(new Error('x'))).toBeNull()
    expect(unwrapGqlError(null)).toBeNull()
    expect(unwrapGqlError(undefined)).toBeNull()
  })
})

describe('toGqlError', () => {
  it('returns an Error as it is', () => {
    const error = new Error('closed')
    expect(toGqlError(error)).toBe(error)
  })

  it('turns the array of GraphQL errors graphql-ws sends into a GqlError, with defaults for missing parts', () => {
    const error = toGqlError(
      [
        { message: 'denied', path: ['sub'], extensions: { code: 'FORBIDDEN' } },
        { extensions: undefined },
        null,
      ],
      'Updated',
    ) as GqlError
    expect(error).toBeInstanceOf(GqlError)
    expect(error.errors).toEqual([
      { message: 'denied', path: ['sub'], extensions: { code: 'FORBIDDEN' } },
      { message: 'GraphQL error' },
      { message: 'GraphQL error' },
    ])
    expect(error.code).toBe('FORBIDDEN')
    expect(error.operationName).toBe('Updated')
  })

  it('wraps anything else (a string, an empty array, a close event) in a plain Error', () => {
    expect(toGqlError('boom')).toMatchObject({ message: 'boom' })
    expect(toGqlError([])).toBeInstanceOf(Error)
    expect(toGqlError([])).not.toBeInstanceOf(GqlError)
    expect(toGqlError(undefined).message).toBe('undefined')
  })
})

describe('isReportableError: an HTTP error that is not a GqlError', () => {
  it.each([
    ['a status', { status: 500 }],
    ['a statusCode', { statusCode: 502 }],
    ['a response status', { response: { status: 503 } }],
  ])('is a server fault when it has %s of 5xx', (_label, error) => {
    expect(isReportableError(error)).toBe(true)
  })

  it.each([
    ['a status', { status: 422 }],
    ['a statusCode', { statusCode: 404 }],
    ['a response status', { response: { status: 401 } }],
  ])("is the customer's input when it has %s of 4xx", (_label, error) => {
    expect(isReportableError(error)).toBe(false)
  })

  it('is a dropped connection (not ours) for a FetchError without status, ours for any other error or value', () => {
    expect(isReportableError({ name: 'FetchError' })).toBe(false)
    expect(isReportableError(new TypeError('x is undefined'))).toBe(true)
    expect(isReportableError(null)).toBe(true)
    expect(isReportableError('boom')).toBe(true)
  })

  it('is never reportable when aborted, even behind a cause', () => {
    expect(isReportableError({ name: 'AbortError' })).toBe(false)
    expect(isReportableError({ cause: { name: 'AbortError' } })).toBe(false)
  })
})

describe('isReportableError: a GqlError', () => {
  const withCode = (code: string | null, init: ConstructorParameters<typeof GqlError>[1] = {}) =>
    new GqlError([{ message: 'x', ...(code ? { extensions: { code } } : {}) }], init)

  it('ignores a dropped connection', () => {
    expect(isReportableError(withCode(GQL_NETWORK_ERROR))).toBe(false)
  })

  it('reports HTTP 5xx only, and treats a missing status as 0', () => {
    expect(isReportableError(withCode(GQL_HTTP_ERROR, { status: 500 }))).toBe(true)
    expect(isReportableError(withCode(GQL_HTTP_ERROR, { status: 429 }))).toBe(false)
    expect(isReportableError(withCode(GQL_HTTP_ERROR))).toBe(false)
  })

  it('reports an error without a code (an old backend, unclassified) and the codes that are our fault', () => {
    expect(isReportableError(withCode(null))).toBe(true)
    for (const code of [
      'ORDER_CREATE_FAILED',
      'PAYMENT_FAILED',
      'COUPON_RESERVE_FAILED',
      'ADDRESS_UNRESOLVABLE',
      'INTERNAL_SERVER_ERROR',
    ]) {
      expect(isReportableError(withCode(code))).toBe(true)
    }
  })

  it("does not report what is the customer's input or session", () => {
    for (const code of ['UNAUTHENTICATED', 'FORBIDDEN', 'COUPON_INVALID', 'DELIVERY_OUT_OF_ZONE']) {
      expect(isReportableError(withCode(code))).toBe(false)
    }
  })

  it('reads a GqlError behind a Nuxt error', () => {
    expect(isReportableError({ cause: withCode('PAYMENT_FAILED') })).toBe(true)
    expect(isReportableError({ cause: withCode('FORBIDDEN') })).toBe(false)
  })
})

describe('describeGqlError with errors that are not GqlErrors', () => {
  it.each([
    ['a plain Error', new Error('boom')],
    ['a string', 'boom'],
    ['null', null],
    ['undefined', undefined],
  ])('knows nothing about %s (the caller shows its own generic message)', (_label, error) => {
    expect(describeGqlError(error, DEFAULT_ORDERING_POLICY)).toBeNull()
  })

  it('recognises the English message of an old backend that interpolates a choice name', () => {
    expect(
      describeGqlError(
        new GqlError([{ message: 'Choice Spicy mayo not found' }]),
        DEFAULT_ORDERING_POLICY,
      ),
    ).toEqual({ key: 'notify.errors.selectionInvalid' })
  })

  it('shows nothing specific for an HTTP error without a status, nor a 4xx; the throttle and 5xx have their own', () => {
    const http = (status?: number) =>
      new GqlError([{ message: 'x', extensions: { code: GQL_HTTP_ERROR } }], { status })
    expect(describeGqlError(http(), DEFAULT_ORDERING_POLICY)).toBeNull()
    expect(describeGqlError(http(404), DEFAULT_ORDERING_POLICY)).toBeNull()
    expect(describeGqlError(http(429), DEFAULT_ORDERING_POLICY)).toEqual({
      key: 'notify.errors.tooManyRequests',
    })
    expect(describeGqlError(http(500), DEFAULT_ORDERING_POLICY)).toEqual({
      key: 'notify.errors.serverError',
    })
  })

  it('knows nothing about a backend message it does not recognise, with no code', () => {
    expect(
      describeGqlError(
        new GqlError([{ message: 'something unheard of' }]),
        DEFAULT_ORDERING_POLICY,
      ),
    ).toBeNull()
  })
})

describe('describeCouponRefusal', () => {
  it('falls back to the generic coupon message for a refusal it cannot place', () => {
    expect(describeCouponRefusal({ valid: false }, DEFAULT_ORDERING_POLICY)).toEqual({
      key: 'coupon.invalid',
    })
    expect(
      describeCouponRefusal({ valid: false, errorMessage: 'who knows' }, DEFAULT_ORDERING_POLICY),
    ).toEqual({ key: 'coupon.invalid' })
  })
})
