/*
 * The price estimator of the home and menu pages (audit 1a/1b): the counter's rule, price by weight, turned into a
 * meal price. It is the IN-STORE rule only; online orders are priced base + ingredients (the composer).
 */

/** The counter's price, in cents per 100 g (the "3,49 € / 100 g" of the showcase copy). */
export const COUNTER_PRICE_PER_100G_CENTS = 349

/**
 * Portion presets of the estimator, in grams: small, regular, hearty.
 * PLACEHOLDERS from the audit, to confirm with the store (and any minimum weight).
 */
export const ESTIMATOR_PRESETS_G = [300, 450, 600] as const

/** The slider's range, in grams. */
export const ESTIMATOR_RANGE_G = { min: 200, max: 800, step: 10 } as const

const clampWeight = (grams: number): number =>
  Math.min(Math.max(grams, ESTIMATOR_RANGE_G.min), ESTIMATOR_RANGE_G.max)

/** The counter price of a bowl of `grams`, in cents (rounded to the cent, as the scale does). */
export const estimateCents = (grams: number): number =>
  Math.round((clampWeight(grams) * COUNTER_PRICE_PER_100G_CENTS) / 100)

/** How big the estimator's bowl is drawn: 0.8 at the lightest weight, 1.15 at the heaviest. */
export const estimatorBowlScale = (grams: number): number =>
  Number(
    (
      0.8 +
      ((clampWeight(grams) - ESTIMATOR_RANGE_G.min) /
        (ESTIMATOR_RANGE_G.max - ESTIMATOR_RANGE_G.min)) *
        0.35
    ).toFixed(3),
  )
