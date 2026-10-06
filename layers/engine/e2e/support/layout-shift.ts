import type { Page } from '@playwright/test'

/*
 * Cumulative Layout Shift measured in the page, the way the Web Vitals library counts it: every `layout-shift` entry the
 * visitor did not cause (`hadRecentInput` false), summed. Call `trackLayoutShifts` before the navigation (it installs an
 * init script); `layoutShifts` reads what happened so far. Each shift carries the first moved nodes, to name the culprit.
 */
export interface LayoutShift {
  value: number
  at: number
  nodes: string[]
}

declare global {
  interface Window {
    __layoutShifts?: LayoutShift[]
  }
}

export async function trackLayoutShifts(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__layoutShifts = []
    const describe = (node: Node | null): string => {
      if (!(node instanceof Element)) return String(node?.nodeName)
      const testId = node.getAttribute('data-testid')
      return `${node.tagName.toLowerCase()}${testId ? `[${testId}]` : ''}${node.className && typeof node.className === 'string' ? `.${node.className.split(' ').slice(0, 2).join('.')}` : ''}`
    }
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          value: number
          hadRecentInput: boolean
          sources?: { node: Node | null }[]
        }
        if (shift.hadRecentInput) continue
        window.__layoutShifts?.push({
          value: shift.value,
          at: Math.round(shift.startTime),
          nodes: (shift.sources ?? []).slice(0, 3).map((source) => describe(source.node)),
        })
      }
    }).observe({ type: 'layout-shift', buffered: true })
  })
}

export async function layoutShifts(page: Page): Promise<LayoutShift[]> {
  // Entries are queued to the observer a moment after they happen.
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        setTimeout(resolve, 100)
      }),
  )
  return page.evaluate(() => window.__layoutShifts ?? [])
}

export const totalShift = (shifts: readonly LayoutShift[]): number =>
  shifts.reduce((sum, shift) => sum + shift.value, 0)
