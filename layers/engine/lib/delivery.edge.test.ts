import { describe, expect, it } from 'vite-plus/test'
import { DEFAULT_ORDERING_POLICY } from '../utils/orderingPolicy'
import { isExcludedPostcode } from './delivery'

const policy = { ...DEFAULT_ORDERING_POLICY, excludedPostcodes: ['4020'] }

describe('isExcludedPostcode', () => {
  it('matches the excluded postcode, trimming it', () => {
    expect(isExcludedPostcode(policy, '4020')).toBe(true)
    expect(isExcludedPostcode(policy, ' 4020 ')).toBe(true)
    expect(isExcludedPostcode(policy, '4000')).toBe(false)
  })

  it('a missing postcode is not excluded', () => {
    expect(isExcludedPostcode(policy, undefined)).toBe(false)
    expect(isExcludedPostcode(policy, null)).toBe(false)
    expect(isExcludedPostcode(policy, '')).toBe(false)
  })
})
