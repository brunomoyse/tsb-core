/*
 * Motion rules of the old ygfliege.be (its GSAP layer), as plain functions for the Web Animations API and CSS: the
 * eases as cubic-bezier curves, and the arithmetic of the broth selector, the scroll scrubs and the magnetic CTA.
 */

/** GSAP eases the old site used, as CSS/WAAPI cubic-bezier curves. */
export const MOTION_EASE = {
  power2In: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
  power3Out: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  sineInOut: 'cubic-bezier(0.445, 0.05, 0.55, 0.95)',
  backOut: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const

/** Index wrapped into 0..count-1 (next after the last is the first, previous before the first is the last). */
export const wrapIndex = (index: number, count: number): number => ((index % count) + count) % count

/**
 * Turn direction of a bowl swap: forward (1) to a later broth or from the last back to the first, backward (-1) to an
 * earlier one or from the first round to the last.
 */
export const bowlSwapDirection = (prev: number, next: number, count: number): 1 | -1 => {
  if (prev === count - 1 && next === 0) return 1
  if (prev === 0 && next === count - 1) return -1
  return next > prev ? 1 : -1
}

/** Broth step for a horizontal swipe: 0 under the threshold, next (1) for a swipe left, previous (-1) for a swipe right. */
export const swipeStep = (deltaX: number, threshold = 40): -1 | 0 | 1 => {
  if (Math.abs(deltaX) < threshold) return 0
  return deltaX < 0 ? 1 : -1
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

/**
 * Progress of a scrub that runs while an element scrolls out at the top ("top top" to "bottom top"): 0 while its top is
 * at or below the top of the viewport, 1 once its bottom has passed it.
 */
export const scrollOutProgress = (rectTop: number, height: number): number =>
  height > 0 ? clamp01(-rectTop / height) : 0

/**
 * Progress of a scrub that runs while an element crosses the viewport ("top bottom" to "bottom top"): 0 as its top
 * enters at the bottom, 1 as its bottom leaves at the top.
 */
export const viewportCrossProgress = (
  rectTop: number,
  height: number,
  viewportHeight: number,
): number => {
  const distance = viewportHeight + height
  return distance > 0 ? clamp01((viewportHeight - rectTop) / distance) : 0
}

/** Scroll position that centres a tab in its horizontal rail. */
export const centeredScrollLeft = (
  tabOffsetLeft: number,
  tabWidth: number,
  railWidth: number,
): number => tabOffsetLeft - (railWidth - tabWidth) / 2

/** Offset of a magnetic element toward the pointer: a share of the pointer's distance from the element's centre. */
export const magneticOffset = (
  pointer: { x: number; y: number },
  rect: { left: number; top: number; width: number; height: number },
  strength = 0.25,
): { x: number; y: number } => ({
  x: (pointer.x - rect.left - rect.width / 2) * strength,
  y: (pointer.y - rect.top - rect.height / 2) * strength,
})
