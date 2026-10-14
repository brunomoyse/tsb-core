import {
  ESTIMATOR_PRESETS_G,
  ESTIMATOR_RANGE_G,
  estimateCents,
  estimatorBowlScale,
} from './estimator'
import { describe, expect, it } from 'vite-plus/test'

describe('estimator', () => {
  it('prices a bowl at 3,49 € per 100 g, rounded to the cent, within the slider range', () => {
    expect(estimateCents(450)).toBe(1571)
    expect(estimateCents(300)).toBe(1047)
    expect(estimateCents(100)).toBe(estimateCents(ESTIMATOR_RANGE_G.min))
    expect(estimateCents(5000)).toBe(estimateCents(ESTIMATOR_RANGE_G.max))
  })

  it('draws the bowl from 0.8 to 1.15', () => {
    expect(estimatorBowlScale(ESTIMATOR_RANGE_G.min)).toBe(0.8)
    expect(estimatorBowlScale(ESTIMATOR_RANGE_G.max)).toBe(1.15)
    expect(estimatorBowlScale(500)).toBe(0.975)
  })

  it('offers presets inside the range', () => {
    for (const grams of ESTIMATOR_PRESETS_G) {
      expect(grams).toBeGreaterThanOrEqual(ESTIMATOR_RANGE_G.min)
      expect(grams).toBeLessThanOrEqual(ESTIMATOR_RANGE_G.max)
    }
  })
})
