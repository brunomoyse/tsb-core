// Motion arithmetic ported from the old ygfliege.be GSAP layer.
// Run: `vp test run apps/ygfliege/utils/motion.test.ts`.
import { describe, expect, it } from 'vite-plus/test'
import {
  MOTION_EASE,
  bowlSwapDirection,
  centeredScrollLeft,
  magneticOffset,
  scrollOutProgress,
  swipeStep,
  viewportCrossProgress,
  wrapIndex,
} from './motion'

describe('wrapIndex', () => {
  it.each([
    [0, 5, 0],
    [4, 5, 4],
    [5, 5, 0],
    [6, 5, 1],
    [-1, 5, 4],
    [-6, 5, 4],
  ])('wraps %i into 0..%i-1 as %i', (index, count, expected) => {
    expect(wrapIndex(index, count)).toBe(expected)
  })
})

describe('bowlSwapDirection', () => {
  it('turns forward to a later broth and backward to an earlier one', () => {
    expect(bowlSwapDirection(0, 1, 5)).toBe(1)
    expect(bowlSwapDirection(1, 3, 5)).toBe(1)
    expect(bowlSwapDirection(3, 1, 5)).toBe(-1)
  })

  it('keeps turning forward from the last to the first, backward from the first to the last', () => {
    expect(bowlSwapDirection(4, 0, 5)).toBe(1)
    expect(bowlSwapDirection(0, 4, 5)).toBe(-1)
  })
})

describe('swipeStep', () => {
  it('ignores swipes under 40px', () => {
    expect(swipeStep(0)).toBe(0)
    expect(swipeStep(39)).toBe(0)
    expect(swipeStep(-39)).toBe(0)
  })

  it('goes to the next broth on a swipe left and the previous one on a swipe right', () => {
    expect(swipeStep(-40)).toBe(1)
    expect(swipeStep(-120)).toBe(1)
    expect(swipeStep(40)).toBe(-1)
    expect(swipeStep(80, 100)).toBe(0)
  })
})

describe('scrollOutProgress', () => {
  it('runs from 0 (top at the viewport top) to 1 (bottom gone)', () => {
    expect(scrollOutProgress(64, 800)).toBe(0)
    expect(scrollOutProgress(0, 800)).toBe(0)
    expect(scrollOutProgress(-400, 800)).toBe(0.5)
    expect(scrollOutProgress(-800, 800)).toBe(1)
    expect(scrollOutProgress(-2000, 800)).toBe(1)
  })

  it('stays at 0 for an element without height', () => {
    expect(scrollOutProgress(-100, 0)).toBe(0)
  })
})

describe('viewportCrossProgress', () => {
  it('runs from 0 (entering at the bottom) to 1 (leaving at the top)', () => {
    expect(viewportCrossProgress(900, 300, 900)).toBe(0)
    expect(viewportCrossProgress(1200, 300, 900)).toBe(0)
    expect(viewportCrossProgress(300, 300, 900)).toBe(0.5)
    expect(viewportCrossProgress(-300, 300, 900)).toBe(1)
    expect(viewportCrossProgress(-900, 300, 900)).toBe(1)
  })

  it('stays at 0 without a viewport or an element', () => {
    expect(viewportCrossProgress(0, 0, 0)).toBe(0)
  })
})

describe('centeredScrollLeft', () => {
  it('puts the middle of the tab in the middle of the rail', () => {
    expect(centeredScrollLeft(500, 100, 300)).toBe(400)
    expect(centeredScrollLeft(0, 100, 300)).toBe(-100)
  })
})

describe('magneticOffset', () => {
  it('pulls a quarter of the way toward the pointer, by default', () => {
    const rect = { left: 100, top: 50, width: 200, height: 40 }
    expect(magneticOffset({ x: 200, y: 70 }, rect)).toEqual({ x: 0, y: 0 })
    expect(magneticOffset({ x: 300, y: 90 }, rect)).toEqual({ x: 25, y: 5 })
    expect(magneticOffset({ x: 100, y: 50 }, rect, 0.5)).toEqual({ x: -50, y: -10 })
  })
})

describe('MOTION_EASE', () => {
  it('spells every ease as a cubic-bezier curve', () => {
    for (const ease of Object.values(MOTION_EASE)) expect(ease).toMatch(/^cubic-bezier\(/u)
  })
})
