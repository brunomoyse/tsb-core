import type { Product } from '#engine/types'

// The build-your-own bowls are the products of this category. The shape rule
// (any multi-pick group) is not enough on this menu: the fixed sets also have
// multi-pick groups (extra toppings, condiments, drinks) and are not composers.
export const COMPOSER_CATEGORY_SLUG = 'sur-mesure'

export const isBowlComposer = (p: Product): boolean => p.category.slug === COMPOSER_CATEGORY_SLUG

// Hero card of each composer, by product slug: the official bowl shot and
// the subtitle. A bowl built in a broth gets the beef-bone bowl and the broth
// copy; the dry one (Mala Mix, sans bouillon) the mala dry-mix bowl and a
// subtitle about the sauce instead.
export interface ComposerHero {
  /** Asset base under /public, widths + ext appended by MktPicture. */
  photo: string
  /** I18n key of the subtitle. */
  subtitleKey: string
}

const DEFAULT_HERO: ComposerHero = {
  photo: '/images/bowls/beef-bone-top',
  subtitleKey: 'composer.heroSubtitle',
}

const COMPOSER_HEROES: Record<string, ComposerHero> = {
  'mala-mix-personnalise': {
    photo: '/images/bowls/mala-dry-mix-top',
    subtitleKey: 'composer.heroSubtitleDry',
  },
}

export const composerHero = (slug: string): ComposerHero => COMPOSER_HEROES[slug] ?? DEFAULT_HERO
