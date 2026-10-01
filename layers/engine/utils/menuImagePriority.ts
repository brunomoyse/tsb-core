/*
 * How eagerly a product card's image is fetched, from its position on the WHOLE menu page (audit PR 3.7, P2).
 * The index used to restart in every category, so 6 images per category (60-90 on a full menu) asked for high
 * priority and loaded eagerly, competing with the real LCP image, the CSS and the JS. Now only the first two
 * images of the page are `fetchpriority="high"`, the first four load eagerly (what a phone shows above the
 * fold), and the rest are lazy and low priority.
 */
export const HIGH_PRIORITY_IMAGES = 2
export const EAGER_IMAGES = 4

export interface MenuImagePriority {
    loading: 'eager' | 'lazy'
    fetchpriority: 'high' | 'low' | undefined
}

export const menuImagePriority = (pageIndex: number): MenuImagePriority => ({
    loading: pageIndex < EAGER_IMAGES ? 'eager' : 'lazy',
    fetchpriority: pageIndex < HIGH_PRIORITY_IMAGES ? 'high' : pageIndex < EAGER_IMAGES ? undefined : 'low',
})

/** The position of each category's first card on the page, so a card's page index is `offsets[category] + indexInCategory`. */
export const categoryCardOffsets = (counts: number[]): number[] => {
    let total = 0
    return counts.map((count) => {
        const offset = total
        total += count
        return offset
    })
}
