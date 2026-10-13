import type { Product } from '#engine/types'

// The build-your-own bowls are the products of this category. The shape rule
// (any multi-pick group) is not enough on this menu: the fixed sets also have
// multi-pick groups (extra toppings, condiments, drinks) and are not composers.
export const COMPOSER_CATEGORY_SLUG = 'sur-mesure'

export const isBowlComposer = (p: Product): boolean => p.category.slug === COMPOSER_CATEGORY_SLUG

// Official bowl shot of each composer's hero card, by product slug. A bowl
// built in a broth gets the beef-bone bowl, the dry one the mala dry-mix bowl.
const COMPOSER_HERO_PHOTOS: Record<string, string> = {
  'mala-mix-personnalise': '/images/bowls/mala-dry-mix-top',
}

export const composerHeroPhoto = (slug: string): string =>
  COMPOSER_HERO_PHOTOS[slug] ?? '/images/bowls/beef-bone-top'
