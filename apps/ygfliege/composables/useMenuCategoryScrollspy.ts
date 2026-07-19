import { type Ref, nextTick, onBeforeUnmount, onMounted, ref, watch } from '#imports'

/**
 * Scrollspy + jump helper for the mobile category chip nav on /menu.
 *
 * Detection uses an IntersectionObserver band — a thin horizontal strip just
 * below the sticky header — instead of visibility thresholds, because category
 * sections can be taller than the viewport (a threshold never fires on those).
 * Among the sections crossing the band, the topmost in menu order wins, which
 * keeps the active chip stable at section boundaries.
 *
 * No scroll listeners: the cart-sidebar scroll-anchoring code in menu.vue
 * re-scrolls the page on reflow, and a scroll-driven spy would fight it.
 */
export const useMenuCategoryScrollspy = (categoryIds: Ref<string[]>) => {
    const activeCategoryId = ref<string | null>(null)
    const chipRowRef = ref<HTMLElement | null>(null)

    let observer: IntersectionObserver | null = null
    let reducedMotion = false
    /** Ignore observer updates while a chip-triggered smooth scroll is in
     *  flight, so intermediate sections don't flash active. */
    let suppressSpyUntil = 0
    const inBand = new Set<string>()

    const sectionEl = (id: string) =>
        document.getElementById(`category-${id}`)

    const observeAll = () => {
        if (!observer) return
        observer.disconnect()
        inBand.clear()
        for (const id of categoryIds.value) {
            const el = sectionEl(id)
            if (el) observer.observe(el)
        }
    }

    onMounted(() => {
        reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                const id = entry.target.id.replace('category-', '')
                if (entry.isIntersecting) inBand.add(id)
                else inBand.delete(id)
            }
            if (Date.now() < suppressSpyUntil) return
            const topmost = categoryIds.value.find(id => inBand.has(id))
            if (topmost) activeCategoryId.value = topmost
        }, {
            // Band = viewport strip from below the sticky header (~200px) down to 45% height; threshold 0 fires on any overlap.
            rootMargin: '-200px 0px -55% 0px',
            threshold: 0,
        })
        observeAll()
    })

    onBeforeUnmount(() => {
        observer?.disconnect()
        observer = null
    })

    // Search filtering swaps the rendered sections — re-observe the new set.
    watch(categoryIds, async () => {
        await nextTick()
        observeAll()
    })

    // Keep the active chip visible in the horizontally scrollable row.
    watch(activeCategoryId, async (id) => {
        if (!id) return
        await nextTick()
        const chip = chipRowRef.value?.querySelector<HTMLElement>(`[data-chip-category="${id}"]`)
        // The row sits in the always-visible sticky header, so with block 'nearest' this never scrolls the page vertically.
        chip?.scrollIntoView({
            behavior: reducedMotion ? 'auto' : 'smooth',
            inline: 'center',
            block: 'nearest',
        })
    })

    /** Jump to a section; the offset for navbar + sticky header comes from the
     *  scroll-mt-* utilities on the section elements. */
    const scrollToCategory = (id: string) => {
        activeCategoryId.value = id
        suppressSpyUntil = Date.now() + 800
        sectionEl(id)?.scrollIntoView({
            behavior: reducedMotion ? 'auto' : 'smooth',
            block: 'start',
        })
    }

    return { activeCategoryId, chipRowRef, scrollToCategory }
}
