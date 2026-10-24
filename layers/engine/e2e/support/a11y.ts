import { type Page, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/*
 * Automated accessibility check (axe-core) of the page as it is on screen: WCAG 2.0/2.1 A and AA rules, failing on the
 * serious and critical violations (moderate and minor ones are reported in the failing message only when there is a
 * blocking one, they never fail a run on their own: they are a backlog, not a gate).
 *
 * Add `known` rule ids only for a violation that is understood and tracked (with the reason next to it in the spec):
 * the entry is the lever that keeps the gate from rotting, so an empty list is the goal.
 */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

export interface AxeSummary {
  id: string
  impact: string | null | undefined
  help: string
  nodes: string[]
}

export async function accessibilityViolations(
  page: Page,
  options: { known?: string[]; exclude?: string[] } = {},
): Promise<AxeSummary[]> {
  let builder = new AxeBuilder({ page }).withTags(TAGS)
  for (const selector of options.exclude ?? []) builder = builder.exclude(selector)
  const results = await builder.analyze()
  const known = new Set(options.known ?? [])
  return results.violations
    .filter(
      (violation) =>
        (violation.impact === 'serious' || violation.impact === 'critical') &&
        !known.has(violation.id),
    )
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      help: violation.help,
      nodes: violation.nodes.slice(0, 5).map((node) => node.target.join(' ')),
    }))
}

/** Fails with the offending rules and the first selectors that break them. */
export async function expectAccessible(
  page: Page,
  label: string,
  options: { known?: string[]; exclude?: string[] } = {},
): Promise<void> {
  expect(
    await accessibilityViolations(page, options),
    `${label}: serious or critical accessibility violations (axe-core)`,
  ).toEqual([])
}
