/*
 * The pure rules of the menu's category scroll-spy (composables/useMenuCategoryScrollspy.ts).
 *
 * The spy watches a thin horizontal band just below the sticky header instead of a visibility threshold,
 * because a category section can be taller than the viewport (a threshold never fires on those). Among the
 * sections that cross the band, the topmost in menu order wins, which keeps the active category stable at
 * section boundaries.
 */

/** Band used when the caller has no sticky header to measure: from 200px (below the header) down to 45% of the viewport. */
export const DEFAULT_BAND_MARGIN = '-200px 0px -55% 0px'

/** Height of the band under a measured header: a fifth of the viewport, never thinner than this. */
export const MIN_BAND_HEIGHT = 96

/**
 * `rootMargin` for a band that starts `headerBottom` px from the top of the viewport (the sticky header's bottom
 * edge). Shrinks the root from the top to start below the header, and from the bottom to leave `band` px, so a
 * short viewport (a phone in landscape) still has a band: the bottom inset never goes negative.
 */
export const bandRootMargin = (headerBottom: number, viewportHeight: number): string => {
    const top = Math.max(0, Math.round(headerBottom)) + 8
    const band = Math.max(MIN_BAND_HEIGHT, Math.round(viewportHeight * 0.2))
    const bottom = Math.max(0, viewportHeight - top - band)
    return `-${top}px 0px -${bottom}px 0px`
}

/** The topmost category (menu order) among those crossing the band, or null when none does. */
export const topmostInBand = (orderedIds: readonly string[], inBand: ReadonlySet<string>): string | null =>
    orderedIds.find(id => inBand.has(id)) ?? null

/** The id of a category section element (`category-<id>`), the inverse of the DOM id the menu page gives each section. */
export const categoryIdFromSection = (elementId: string): string => elementId.replace('category-', '')
