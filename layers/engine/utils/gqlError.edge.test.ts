// GqlError construction from every transport shape, and what is worth reporting.
import { describe, expect, it } from 'vite-plus/test'
import {
  GQL_HTTP_ERROR,
  GQL_NETWORK_ERROR,
  GqlError,
  isReportableError,
  toGqlError,
  unwrapGqlError,
} from './gqlError'

describe('GqlError constructor', () => {
  it('has a generic message and no code for an empty error list', () => {
    const error = new GqlError([])
    expect(error.message).toBe('GraphQL request failed')
    expect(error.code).toBeNull()
    expect(error.extensions).toEqual({})
    expect(error.cause).toBeUndefined()
  })

  it('keeps the cause, operation name and status it is given', () => {
    const cause = new Error('socket')
    const error = new GqlError([{ message: 'x' }], { cause, operationName: 'Foo', status: 503 })
    expect(error.cause).toBe(cause)
    expect(error.operationName).toBe('Foo')
    expect(error.status).toBe(503)
  })

  it('a non-string code is no code', () => {
    expect(new GqlError([{ message: 'x', extensions: { code: 42 } }]).code).toBeNull()
  })
})

describe('GqlError.fromTransport', () => {
  it('keeps the GraphQL errors of a non-2xx body, with their path and extensions', () => {
    const error = GqlError.fromTransport(
      {
        status: 422,
        data: {
          errors: [
            {
              message: 'bad field',
              path: ['a', 0],
              extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
            },
            { message: 'second' },
            { nope: true },
            null,
          ],
        },
      },
      'Quote',
    )
    expect(error.errors).toEqual([
      { message: 'bad field', path: ['a', 0], extensions: { code: 'GRAPHQL_VALIDATION_FAILED' } },
      { message: 'second' },
    ])
    expect(error.code).toBe('GRAPHQL_VALIDATION_FAILED')
    expect(error.status).toBe(422)
    expect(error.operationName).toBe('Quote')
  })

  it('a failed HTTP call without usable body errors is an HTTP error with the status', () => {
    const error = GqlError.fromTransport({
      statusCode: 502,
      message: 'Bad Gateway',
      data: { errors: [] },
    })
    expect(error.code).toBe(GQL_HTTP_ERROR)
    expect(error.status).toBe(502)
    expect(error.message).toBe('Bad Gateway')
  })

  it('no status means the connection dropped', () => {
    const error = GqlError.fromTransport(new TypeError('fetch failed'))
    expect(error.code).toBe(GQL_NETWORK_ERROR)
    expect(error.status).toBeNull()
  })

  it('has a default message when the failure has none, even for null', () => {
    expect(GqlError.fromTransport({ status: 500 }).message).toBe('Request failed')
    expect(GqlError.fromTransport(null).message).toBe('Request failed')
    expect(GqlError.fromTransport(null).code).toBe(GQL_NETWORK_ERROR)
  })
})

describe('toGqlError', () => {
  it('returns an Error as it is', () => {
    const error = new Error('x')
    expect(toGqlError(error)).toBe(error)
  })

  it('turns the array of errors of graphql-ws into one GqlError', () => {
    const error = toGqlError(
      [{ message: 'a', path: ['x'], extensions: { code: 'C' } }, { message: undefined }, null],
      'Sub',
    ) as GqlError
    expect(error).toBeInstanceOf(GqlError)
    expect(error.errors).toEqual([
      { message: 'a', path: ['x'], extensions: { code: 'C' } },
      { message: 'GraphQL error' },
      { message: 'GraphQL error' },
    ])
    expect(error.operationName).toBe('Sub')
  })

  it('stringifies anything else, an empty array included', () => {
    expect(toGqlError('boom').message).toBe('boom')
    expect(toGqlError([]).message).toBe('')
    expect(toGqlError(undefined).message).toBe('undefined')
  })
})

describe('unwrapGqlError', () => {
  it('finds a GqlError behind up to two causes (NuxtError wrapping)', () => {
    const inner = new GqlError([{ message: 'x' }])
    expect(unwrapGqlError(Object.assign(new Error('wrap'), { cause: { cause: inner } }))).toBe(
      inner,
    )
  })

  it('is null for something else or too deep', () => {
    expect(unwrapGqlError(new Error('x'))).toBeNull()
    expect(unwrapGqlError(null)).toBeNull()
    const inner = new GqlError([{ message: 'x' }])
    expect(unwrapGqlError({ cause: { cause: { cause: inner } } })).toBeNull()
  })
})

describe('isReportableError', () => {
  const gql = (init: ConstructorParameters<typeof GqlError>[1], code?: string) =>
    new GqlError([{ message: 'x', ...(code ? { extensions: { code } } : {}) }], init)

  it('an HTTP error is reported from 500, not below (and a missing status counts as 0)', () => {
    expect(isReportableError(gql({ status: 500 }, GQL_HTTP_ERROR))).toBe(true)
    expect(isReportableError(gql({ status: 499 }, GQL_HTTP_ERROR))).toBe(false)
    expect(isReportableError(gql({}, GQL_HTTP_ERROR))).toBe(false)
  })

  it('an error without a code (an old backend) is reported; a customer code is not', () => {
    expect(isReportableError(gql({}))).toBe(true)
    expect(isReportableError(gql({}, 'COUPON_EXPIRED'))).toBe(false)
    expect(isReportableError(gql({}, 'ORDER_CREATE_FAILED'))).toBe(true)
  })

  it('a REST failure: reported from 500, not for 4xx or a dropped connection', () => {
    expect(isReportableError({ statusCode: 503 })).toBe(true)
    expect(isReportableError({ response: { status: 404 } })).toBe(false)
    expect(isReportableError({ name: 'FetchError' })).toBe(false)
    expect(isReportableError(new TypeError('x'))).toBe(true)
    expect(isReportableError(null)).toBe(true)
  })
})
