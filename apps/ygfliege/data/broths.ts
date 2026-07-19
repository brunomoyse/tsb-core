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

/**
 * Matches a broth *choice name* (any locale) to its official photo slug.
 *
 * Name-keyword matching replaced the earlier sortOrder-keyed map because the
 * fixed sets don't share the composer's shape: "Menu Découverte" offers 4
 * broths, "Festin Végétarien" only 2 (tomato at sortOrder 0 — which the old
 * map would have captioned as beef bone). Keywords cover all four locales of
 * `product_choice_translations` in the seed. Order matters: "tom-yum" is
 * tested before "tomato" so nl "tomyum-bouillon" never falls into the tomato
 * bucket.
 */
const BROTH_PHOTO_KEYWORDS: ReadonlyArray<{ slug: string; pattern: RegExp }> = [
    { slug: 'tom-yum', pattern: /tom ?yum|冬阴/iu },
    { slug: 'tomato', pattern: /tomate|tomato|tomaten|番茄/iu },
    { slug: 'beef-bone', pattern: /bœuf|boeuf|beef|runderbot|骨汤/iu },
    { slug: 'mushroom', pattern: /champignon|mushroom|paddensto|菌|蘑菇/iu },
    { slug: 'mala-dry-mix', pattern: /mala|麻辣拌/iu },
]

export const brothSlugForName = (name: string): string | undefined =>
    BROTH_PHOTO_KEYWORDS.find(({ pattern }) => pattern.test(name))?.slug

/**
 * choiceId → photo slug for a whole pick-one group, or null when the group
 * shouldn't get photos. All-or-nothing, and each slug may be used only once:
 * a group where two choices resolve to the same broth (or one resolves to
 * none) renders as text chips instead of risking a wrong or duplicate photo.
 */
export const brothPhotoSlugs = (
    choices: ReadonlyArray<{ id: string; name: string }>,
): Record<string, string> | null => {
    if (choices.length === 0) return null
    const bySlug = new Set<string>()
    const out: Record<string, string> = {}
    for (const choice of choices) {
        const slug = brothSlugForName(choice.name)
        if (!slug || bySlug.has(slug)) return null
        bySlug.add(slug)
        out[choice.id] = slug
    }
    return out
}
