// The five official YGF signature broths (franchiser menu). Copy lives under
// the `mkt.broths.<key>` locale namespace; photos are the official kit sets in
// /images/broths/<slug>-{480,800,1200}.* and /images/bowls/<slug>-top-*.
export interface Broth {
    /** i18n key under `mkt.broths.` */
    key: string
    /** file slug for /images/broths and /images/bowls assets */
    slug: string
    /** chilis displayed (0 = not spicy, 1 = mild, 3 = pick-your-heat) */
    spiceLevel: 0 | 1 | 3
    vegan: boolean
}

export const BROTHS: Broth[] = [
    { key: 'beef_bone', slug: 'beef-bone', spiceLevel: 3, vegan: false },
    { key: 'tomato', slug: 'tomato', spiceLevel: 0, vegan: true },
    { key: 'mala_dry', slug: 'mala-dry-mix', spiceLevel: 1, vegan: true },
    { key: 'tom_yum', slug: 'tom-yum', spiceLevel: 1, vegan: false },
    { key: 'mushroom', slug: 'mushroom', spiceLevel: 0, vegan: true },
]
