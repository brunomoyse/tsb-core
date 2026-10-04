// GqlError and its helpers: the one error type of every GraphQL call (gqlFetch, useGqlQuery, useGqlMutation, subscriptions).
// One file for utils/gqlError.ts: construction rules, the odd inputs of transports, abort detection and the Sentry filter.
// The message table (code -> i18n key) is tested in gqlErrors.test.mjs.
// Run: `vp test run layers/engine/utils/gqlError.test.ts`.
import { describe, expect, it } from 'vite-plus/test'
import {
  GQL_HTTP_ERROR,
  GQL_NETWORK_ERROR,
  GqlError,
  isAbortError,
  isGqlError,
  isReportableError,
  operationNameOf,
  toGqlError,
  unwrapGqlError,
} from './gqlError.ts'

describe('GqlError', () => {
  it('has a generic message, no code and empty extensions when the response carried no error entry', () => {
    const error = new GqlError([])
    expect(error.message).toBe('GraphQL request failed')
    expect(error.code).toBeNull()
    expect(error.extensions).toEqual({})
    expect(error.errors).toEqual([])
    expect(error.operationName).toBeNull()
    expect(error.status).toBeNull()
    expect(error.cause).toBeUndefined()
  })

  it('is a real Error carrying code, extensions, errors and the operation', () => {
    const error = new GqlError(
      [
        {
          message: 'product Salmon not found',
          path: ['createOrder'],
          extensions: { code: 'PRODUCT_NOT_FOUND', productId: 'p1' },
        },
      ],
      { operationName: 'CreateOrder' },
    )
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('GqlError')
    expect(error.code).toBe('PRODUCT_NOT_FOUND')
    expect(error.extensions).toEqual({ code: 'PRODUCT_NOT_FOUND', productId: 'p1' })
    expect(error.operationName).toBe('CreateOrder')
    expect(error.errors).toHaveLength(1)
    expect(error.message).toBe('product Salmon not found')
    expect(error.stack).toContain('GqlError')
    expect(error.hasCode('PRODUCT_NOT_FOUND')).toBe(true)
  })

  it('an error entry without extensions has no code (an old backend)', () => {
    expect(new GqlError([{ message: 'product X not found' }]).code).toBeNull()
  })

  it('takes message, code and extensions from the first error, and ignores a code that is not a string', () => {
    const error = new GqlError([
      { message: 'first', extensions: { code: 42, field: 'x' } },
      { message: 'second', extensions: { code: 'SECOND' } },
    ])
    expect(error.message).toBe('first')
    expect(error.code).toBeNull()
    expect(error.extensions).toEqual({ code: 42, field: 'x' })
    // hasCode looks at every entry, `code` only at the first.
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
    const http = Object.assign(new Error('502 Bad Gateway'), { status: 502 })
    const error = GqlError.fromTransport(http, 'Menu')
    expect(error).toMatchObject({ code: GQL_HTTP_ERROR, status: 502, operationName: 'Menu' })
    expect(error.cause).toBe(http)
  })

  it('a failed answer whose body has no GraphQL errors stays the transport error it was', () => {
    const error = GqlError.fromTransport(
      Object.assign(new Error('x'), { status: 502, data: { error: 'bad gateway' } }),
    )
    expect(error.code).toBe(GQL_HTTP_ERROR)
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

describe('operationNameOf', () => {
  it('is the name of the query or mutation, null for an anonymous one', () => {
    expect(operationNameOf('mutation CreateOrder($input: X!) { createOrder }')).toBe('CreateOrder')
    expect(operationNameOf('query ValidateCoupon { a }')).toBe('ValidateCoupon')
    expect(operationNameOf('{ me { id } }')).toBeNull()
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
    expect(toGqlError([]).message).toBe('')
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

describe('isAbortError', () => {
  const abort = () => Object.assign(new Error('aborted'), { name: 'AbortError' })

  it('is an abort wrapped by ofetch (FetchError -> cause AbortError) or by the transport, however deep', () => {
    const fetchError = Object.assign(new Error('[POST] "/graphql": <no response> aborted'), {
      name: 'FetchError',
      cause: abort(),
    })
    expect(isAbortError(abort())).toBe(true)
    expect(isAbortError(fetchError)).toBe(true)
    expect(isReportableError(fetchError)).toBe(false)
    expect(isAbortError(GqlError.fromTransport(fetchError))).toBe(true)
  })

  it('is not anything else, and a cyclic cause chain ends', () => {
    expect(isAbortError(Object.assign(new Error('x'), { cause: new Error('y') }))).toBe(false)
    expect(isAbortError(new Error('x'))).toBe(false)
    expect(isAbortError(null)).toBe(false)
    const loop = new Error('loop')
    loop.cause = loop
    expect(isAbortError(loop)).toBe(false)
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
    expect(isReportableError(withCode(GQL_HTTP_ERROR, { status: 499 }))).toBe(false)
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
    for (const code of [
      'UNAUTHENTICATED',
      'FORBIDDEN',
      'COUPON_INVALID',
      'COUPON_EXPIRED',
      'DELIVERY_OUT_OF_ZONE',
      'RATE_LIMITED',
    ]) {
      expect(isReportableError(withCode(code))).toBe(false)
    }
  })

  it('reads a GqlError behind a Nuxt error', () => {
    expect(isReportableError({ cause: withCode('PAYMENT_FAILED') })).toBe(true)
    expect(isReportableError({ cause: withCode('FORBIDDEN') })).toBe(false)
  })
})
