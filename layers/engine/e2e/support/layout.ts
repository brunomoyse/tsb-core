import { type Page, expect } from '@playwright/test'

/*
 * Layout guardrails for narrow screens, reusable on any page and any viewport:
 *
 *   measureLayout(page)        horizontal overflow, small tap targets and overlapping controls, as lists of offenders
 *   expectMobileLayout(page)   fails (softly, every kind at once) with those lists
 *
 *   overflow    what sticks out of the viewport sideways where a customer cannot reach it. A horizontal scroller
 *               (`overflow-x: auto`, the chip rows) may be wider than the screen: its content is reachable by scrolling.
 *   small       tappable controls under 44 px tall, or under 44 px wide when they carry no text (an icon button); a
 *               control with text only needs 24 px of width (a short link such as "CGV"). A link inside a sentence is exempt.
 *   overlap     pairs of controls whose boxes cover each other, so a tap could hit the wrong one. Only controls that are
 *               on top at their own centre count: one under the cart bar or behind a modal is not reachable anyway. A fixed
 *               or sticky control (cart bar, scroll-to-top, category strip) floats over the scrolling content by design:
 *               it is only compared with other floating controls.
 *
 * Decorations (`aria-hidden`), the screen-reader-only text and the closed phone menu (`inert`) are ignored. Everything
 * runs in one page.evaluate (the apps' CSP forbids eval, so the helpers cannot be shipped as source strings).
 */

export interface LayoutReport {
  overflow: string[]
  small: string[]
  overlap: string[]
}

export const MIN_TARGET = 44

export function measureLayout(page: Page, minimum = MIN_TARGET): Promise<LayoutReport> {
  return page.evaluate((min) => {
    const targets =
      'button, [role="button"], [role="switch"], [role="option"], [role="tab"], select, summary, ' +
      'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea, a[href]'

    const name = (el: Element): string => {
      const text = (el.getAttribute('aria-label') ?? el.textContent ?? '')
        .trim()
        .replace(/\s+/gu, ' ')
        .slice(0, 40)
      const cls = (el.getAttribute('class') ?? '')
        .split(/\s+/u)
        .filter(Boolean)
        .slice(0, 3)
        .join('.')
      const testId = el.getAttribute('data-testid')
      return `${el.tagName.toLowerCase()}${testId ? `[${testId}]` : ''}${cls ? `.${cls}` : ''}${text ? ` "${text}"` : ''}`
    }

    // Invisible, inert or decorative: never a candidate.
    const ignored = (el: Element): boolean => {
      for (
        let node: Element | null = el;
        node && node !== document.documentElement;
        node = node.parentElement
      ) {
        if (node.hasAttribute('inert') || node.getAttribute('aria-hidden') === 'true') return true
        const style = getComputedStyle(node)
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          Number(style.opacity) === 0
        )
          return true
        if (node.classList.contains('sr-only')) return true
      }
      return false
    }

    const width = document.documentElement.clientWidth
    const outside = (rect: DOMRect): boolean => rect.right > width + 0.5 || rect.left < -0.5

    // Reachable or hidden on purpose: inside a horizontal scroller, or cut by a box that is itself on screen and narrower
    // than the page (a card with overflow hidden around a decoration). The page-wide wrappers (main, body) do not count:
    // content they clip is simply lost.
    const contained = (el: Element): boolean => {
      for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
        const { overflowX } = getComputedStyle(node)
        if (overflowX === 'auto' || overflowX === 'scroll') return true
        if (overflowX === 'hidden' || overflowX === 'clip') {
          const rect = node.getBoundingClientRect()
          if (!outside(rect) && rect.width < width - 1 && node.tagName !== 'MAIN') return true
        }
      }
      return false
    }

    const overflow: string[] = []
    if (document.documentElement.scrollWidth > width)
      overflow.push(`the page scrolls sideways: ${document.documentElement.scrollWidth} > ${width}`)
    for (const el of document.body.querySelectorAll('*')) {
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0 || !outside(rect)) continue
      if (ignored(el) || contained(el)) continue
      // The outermost offender only: its children overflow with it.
      const parent = el.parentElement
      if (parent && parent !== document.body && outside(parent.getBoundingClientRect())) continue
      overflow.push(
        `${name(el)} spans ${Math.round(rect.left)}..${Math.round(rect.right)} of ${width}`,
      )
    }

    // The part of a box a finger can reach: cut by every ancestor that clips (a card half scrolled under a footer still has
    // its whole box, but only the visible half can be tapped).
    const visibleBox = (
      el: Element,
    ): { left: number; right: number; top: number; bottom: number } => {
      const own = el.getBoundingClientRect()
      const box = { left: own.left, right: own.right, top: own.top, bottom: own.bottom }
      for (
        let node = el.parentElement;
        node && node !== document.documentElement;
        node = node.parentElement
      ) {
        const style = getComputedStyle(node)
        const clipsX = style.overflowX !== 'visible'
        const clipsY = style.overflowY !== 'visible'
        if (!clipsX && !clipsY) continue
        const clip = node.getBoundingClientRect()
        if (clipsX) {
          box.left = Math.max(box.left, clip.left)
          box.right = Math.min(box.right, clip.right)
        }
        if (clipsY) {
          box.top = Math.max(box.top, clip.top)
          box.bottom = Math.min(box.bottom, clip.bottom)
        }
      }
      return box
    }

    const small: string[] = []
    const reachable: {
      el: Element
      rect: { left: number; right: number; top: number; bottom: number }
    }[] = []
    for (const el of document.querySelectorAll(targets)) {
      if (ignored(el)) continue
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue
      // A link in the middle of a sentence is text, not a button (WCAG 2.5.8 inline exception).
      const inline = el.tagName === 'A' && getComputedStyle(el).display === 'inline'
      const hasText = (el.textContent ?? '').trim().length > 0 && el.tagName !== 'SELECT'
      const tooNarrow = rect.width + 0.5 < (hasText ? 24 : min)
      if (!inline && (tooNarrow || rect.height + 0.5 < min))
        small.push(`${name(el)} is ${Math.round(rect.width)}x${Math.round(rect.height)}`)
      const box = visibleBox(el)
      if (box.bottom <= box.top || box.right <= box.left) continue
      if (box.bottom <= 0 || box.top >= window.innerHeight) continue
      if (box.right <= 0 || box.left >= window.innerWidth) continue
      const x = Math.min(Math.max((box.left + box.right) / 2, 0), window.innerWidth - 1)
      const y = Math.min(Math.max((box.top + box.bottom) / 2, 0), window.innerHeight - 1)
      const top = document.elementFromPoint(x, y)
      if (top && (top === el || el.contains(top) || top.contains(el)))
        reachable.push({ el, rect: box })
    }

    const floating = (el: Element): boolean => {
      for (let node: Element | null = el; node; node = node.parentElement) {
        const { position } = getComputedStyle(node)
        if (position === 'fixed' || position === 'sticky') return true
      }
      return false
    }

    const overlap: string[] = []
    for (let i = 0; i < reachable.length; i++)
      for (let j = i + 1; j < reachable.length; j++) {
        const a = reachable[i]
        const b = reachable[j]
        if (!a || !b || a.el.contains(b.el) || b.el.contains(a.el)) continue
        if (floating(a.el) !== floating(b.el)) continue
        const w = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left)
        const h = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top)
        if (w > 4 && h > 4)
          overlap.push(`${name(a.el)} overlaps ${name(b.el)} by ${Math.round(w)}x${Math.round(h)}`)
      }

    return { overflow, small, overlap }
  }, minimum)
}

/** The three checks at once, soft: every kind of problem on the page is reported, not just the first. */
export async function expectMobileLayout(page: Page, label: string): Promise<void> {
  const width = page.viewportSize()?.width ?? 0
  const report = await measureLayout(page)
  expect.soft(report.overflow, `${label} @${width}: sticks out sideways`).toEqual([])
  expect.soft(report.small, `${label} @${width}: tap targets under ${MIN_TARGET} px`).toEqual([])
  expect.soft(report.overlap, `${label} @${width}: overlapping controls`).toEqual([])
}
