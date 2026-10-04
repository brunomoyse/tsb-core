import { describe, expect, it } from 'vite-plus/test'
import { roundCentsToStep } from './money'

describe('roundCentsToStep edge cases', () => {
  it('a non-finite amount is returned as it is', () => {
    expect(roundCentsToStep(Number.NaN, 10)).toBeNaN()
    expect(roundCentsToStep(Number.POSITIVE_INFINITY, 10)).toBe(Number.POSITIVE_INFINITY)
  })

  it.each([0, 1, -5, Number.NaN, Number.POSITIVE_INFINITY])(
    'a step of %s (no rounding step) rounds to whole cents',
    (step) => {
      expect(roundCentsToStep(1234.4, step)).toBe(1234)
      expect(roundCentsToStep(1234.5, step)).toBe(1235)
    },
  )

  it('never returns -0', () => {
    expect(Object.is(roundCentsToStep(-0.4, 1), 0)).toBe(true)
    expect(Object.is(roundCentsToStep(-3, 10), 0)).toBe(true)
  })
})
