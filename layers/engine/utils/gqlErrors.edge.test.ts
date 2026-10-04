import { describe, expect, it } from 'vite-plus/test'
import { DEFAULT_ORDERING_POLICY } from './orderingPolicy'
import { GQL_HTTP_ERROR, GqlError } from './gqlError'
import { describeGqlError } from './gqlErrors'

const policy = DEFAULT_ORDERING_POLICY
const http = (status: number | null) =>
  new GqlError(
    [{ message: 'x', extensions: { code: GQL_HTTP_ERROR } }],
    status === null ? {} : { status },
  )
const legacy = (message: string) => new GqlError([{ message }])

describe('describeGqlError', () => {
  it('HTTP 429 asks the customer to slow down, 5xx is a server error, other statuses are unknown', () => {
    expect(describeGqlError(http(429), policy)).toEqual({ key: 'notify.errors.tooManyRequests' })
    expect(describeGqlError(http(503), policy)).toEqual({ key: 'notify.errors.serverError' })
    expect(describeGqlError(http(404), policy)).toBeNull()
    expect(describeGqlError(http(null), policy)).toBeNull()
  })

  it('is null for something that is not a GraphQL error', () => {
    expect(describeGqlError(new Error('x'), policy)).toBeNull()
  })

  describe('an old backend that sends no code: the message is matched', () => {
    it('product / choice "not found" with a name in the middle', () => {
      expect(describeGqlError(legacy('Product Maki Saumon not found'), policy)).toEqual(
        describeGqlError(
          new GqlError([{ message: 'x', extensions: { code: 'PRODUCT_NOT_FOUND' } }]),
          policy,
        ),
      )
      expect(describeGqlError(legacy('choice Tomate not found'), policy)).toEqual(
        describeGqlError(
          new GqlError([{ message: 'x', extensions: { code: 'SELECTION_INVALID' } }]),
          policy,
        ),
      )
    })

    it('a known phrase, in any case', () => {
      expect(describeGqlError(legacy('Failed to create order: db down'), policy)).toEqual(
        describeGqlError(
          new GqlError([{ message: 'x', extensions: { code: 'ORDER_CREATE_FAILED' } }]),
          policy,
        ),
      )
    })

    it('an unknown message gives nothing (the caller shows its generic text, never the backend message)', () => {
      expect(describeGqlError(legacy('something exploded'), policy)).toBeNull()
    })
  })
})
