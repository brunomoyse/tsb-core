import {
  DEFAULT_BAND_MARGIN,
  bandRootMargin,
  categoryIdFromSection,
  topmostInBand,
} from '#engine/utils/menuScrollspy'
import { type Ref, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useEventListener, useResizeObserver } from '@vueuse/core'
import { scrollBehavior } from '#engine/utils/scrollBehavior'
import { stickyBottom } from '#engine/composables/useStickyTopOffset'

export interface MenuScrollspyOptions {
  /**
   * The sticky header above the sections. When given, the band starts just below it and a jump lands just
   * below it (measured, so a header that wraps or loses its category strip is followed). Without it the
   * band is fixed (from 200px down to 45% of the viewport). Jumps land under the header either way, through
   * the page's `scroll-padding-top`.
   */
  header?: Readonly<Ref<HTMLElement | null>>
  /** Mark the first category active before the visitor has scrolled (a tab strip with a selected first tab). */
  selectFirst?: boolean
}

/**
 * Scrollspy + jump helper for the category navigation on /menu (the chip row on mobile in one brand, the
 * category card strip in the other).
 *
 * Detection uses an IntersectionObserver band (see utils/menuScrollspy.ts) instead of visibility thresholds,
 * because category sections can be taller than the viewport (a threshold never fires on those). Among the
 * sections crossing the band, the topmost in menu order wins, which keeps the active chip stable at section
 * boundaries.
 *
 * The spy does not follow the scroll position (the cart-sidebar scroll-anchoring code, useMenuScrollAnchor,
 * re-scrolls the page on reflow, and a scroll-driven spy would fight it); the one scroll listener only notices
 * that the page has reached its end, and when it has left it.
 *
 * Section elements are `id="category-<id>"`; the navigation items carry `data-chip-category="<id>"` inside
 * the element bound to `chipRowRef`, so the active one is kept visible in a horizontally scrolling row.
 */
export const useMenuCategoryScrollspy = (
  categoryIds: Ref<string[]>,
  options: MenuScrollspyOptions = {},
) => {
  const { header, selectFirst = false } = options
  const activeCategoryId = ref<string | null>(null)
  const chipRowRef = ref<HTMLElement | null>(null)

  let observer: IntersectionObserver | null = null
  /** The band the observer was created with: a measured header that did not move the band needs no new observer. */
  let appliedMargin = ''
  /** Ignore observer updates while a chip-triggered smooth scroll is in
   *  flight, so intermediate sections don't flash active. */
  let suppressSpyUntil = 0
  const inBand = new Set<string>()
  /** The page is scrolled to its very end: a last section shorter than the band can then never reach it. */
  let atPageEnd = false

  const sectionEl = (id: string) => document.getElementById(`category-${id}`)

  const rootMargin = () =>
    header?.value
      ? bandRootMargin(stickyBottom(header.value), window.innerHeight)
      : DEFAULT_BAND_MARGIN

  /* Nothing crosses the band and the first section is still below it: the page is above the first category (the search,
       the filters and the allergen notice fill the first screen). Another category stays selected from the way down otherwise,
       and the first one goes back to being selected, as before the first scroll. Only when a category is selected already: a
       strip that starts with none (no `selectFirst`) is not given one by a page that has not been read yet. */
  const selectFirstWhenAbove = () => {
    const [first] = categoryIds.value
    const active = activeCategoryId.value
    if (
      first === undefined ||
      first === '' ||
      active === null ||
      active === '' ||
      active === first
    ) {
      return
    }
    if (inBand.size > 0) return
    const section = sectionEl(first)
    if (section && section.getBoundingClientRect().top > 0) activeCategoryId.value = first
  }

  // (Re)creates the observer on the current sections and band. Search filtering swaps the rendered sections, and a measured header may have changed height, so this runs again whenever the ids change.
  const observeAll = () => {
    observer?.disconnect()
    inBand.clear()
    appliedMargin = rootMargin()
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = categoryIdFromSection(entry.target.id)
          if (entry.isIntersecting) inBand.add(id)
          else inBand.delete(id)
        }
        if (Date.now() < suppressSpyUntil || atPageEnd) return
        const topmost = topmostInBand(categoryIds.value, inBand)
        if (topmost !== null && topmost !== '') activeCategoryId.value = topmost
        else selectFirstWhenAbove()
      },
      {
        // Threshold 0 fires on any overlap with the band.
        rootMargin: appliedMargin,
        threshold: 0,
      },
    )
    for (const id of categoryIds.value) {
      const el = sectionEl(id)
      if (el) observer.observe(el)
    }
  }

  onMounted(() => {
    observeAll()
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
  })

  watch(categoryIds, async () => {
    await nextTick()
    if (observer) observeAll()
  })

  /* The band cannot reach a last section that ends above it once the page cannot scroll further: at the very end
       of the page the last category is the active one. Only the moments the end is reached and left are handled
       here, so this never fights the scroll anchoring (it does not follow the scroll position otherwise): on the
       way back up, the observer was muted while the page was at its end, so the band's answer is taken then. */
  useEventListener(
    'scroll',
    () => {
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      const settled = Date.now() >= suppressSpyUntil
      if (atEnd && !atPageEnd && settled) {
        const last = categoryIds.value.at(-1)
        if (last !== undefined && last !== '' && categoryIds.value.length > 1)
          activeCategoryId.value = last
      } else if (!atEnd && atPageEnd && settled) {
        const topmost = topmostInBand(categoryIds.value, inBand)
        if (topmost !== null && topmost !== '') activeCategoryId.value = topmost
        else selectFirstWhenAbove()
      }
      atPageEnd = atEnd
    },
    { passive: true },
  )

  /* A measured band follows the viewport (rotation, a resized window) and the header (a category strip that wraps
       or appears, a banner above it): the observer is made again when the band moved. */
  if (header) {
    const refreshBand = () => {
      if (observer && rootMargin() !== appliedMargin) observeAll()
    }
    useEventListener('resize', refreshBand)
    useResizeObserver(header, refreshBand)
  }

  if (selectFirst) {
    watch(
      categoryIds,
      (ids) => {
        if ((activeCategoryId.value === null || activeCategoryId.value === '') && ids.length > 0) {
          activeCategoryId.value = ids[0]!
        }
      },
      { immediate: true },
    )
  }

  // Keep the active chip visible in the horizontally scrollable row.
  watch(activeCategoryId, async (id) => {
    if (id === null || id === '') return
    await nextTick()
    const row = chipRowRef.value
    const chip = row?.querySelector<HTMLElement>(`[data-chip-category="${id}"]`)
    if (!row || !chip) return
    /* Only the row moves, and only sideways. The row sits in the sticky header, and `chip.scrollIntoView()` would also scroll the
           page: with the page's `scroll-padding-top` (the header's own bottom edge) the chip counts as hidden under the padding, so
           the page would be dragged back up whenever the active category changes. */
    const chipBox = chip.getBoundingClientRect()
    const rowBox = row.getBoundingClientRect()
    row.scrollBy({
      left: chipBox.left + chipBox.width / 2 - (rowBox.left + rowBox.width / 2),
      behavior: scrollBehavior(),
    })
  })

  /** Jump to a section. The offset for navbar + sticky header is the page's `scroll-padding-top` (the brand CSS, fed by
   *  useStickyTopOffset), the same one that keeps a focused element clear of the header. */
  const scrollToCategory = (id: string) => {
    activeCategoryId.value = id
    suppressSpyUntil = Date.now() + 800
    const el = sectionEl(id)
    if (!el) return
    el.scrollIntoView({
      behavior: scrollBehavior(),
      block: 'start',
    })
  }

  return { activeCategoryId, chipRowRef, scrollToCategory }
}
