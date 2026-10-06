import type {
  OrderProduct,
  Product,
  ProductChoice,
  ProductChoiceSelection,
} from '../types/index.ts'
import { sortSelections } from './cartLines.ts'

/*
 * Turns the items of a past order into cart lines (audit M16). Pure: the composable decides what to
 * do with the result (replace or merge into the cart, which toast to show).
 *
 * The order stores each selection LINE-WIDE (2 bowls with 1 broth each = broth × 2), which is exactly
 * what the cart stores (see cartLines.ts), so the selections go to the cart untouched.
 *
 * A line is skipped, never half-restored, when:
 *   - its product is no longer available / visible                       -> 'unavailable'
 *   - a selected choice no longer exists on the product (or moved group) -> 'choices'
 *   - the product's CURRENT group rules (min/max × quantity) are not met -> 'choices'
 * so the customer is told which lines to compose again from the menu. Anything the client cannot see
 * (price changes, rules it has no data for) is caught by the server quote before payment (PR 2.2).
 */

export type ReorderSkipReason = 'unavailable' | 'choices'

export interface ReorderLine {
  product: Product
  quantity: number
  selections: ProductChoiceSelection[]
  /** The legacy single choice, only for old orders that have no selections. */
  choice: ProductChoice | null
}

export interface ReorderSkipped {
  name: string
  quantity: number
  reason: ReorderSkipReason
}

export interface ReorderPlan {
  lines: ReorderLine[]
  skipped: ReorderSkipped[]
}

type ReorderItem = Pick<OrderProduct, 'quantity' | 'product' | 'choice' | 'selections'>

/** True when the selections satisfy every choice group of the product for `quantity` units. */
function groupsSatisfied(
  product: Product,
  selections: ProductChoiceSelection[],
  quantity: number,
): boolean {
  for (const group of product.choiceGroups ?? []) {
    const picked = selections
      .filter((selection) => selection.groupId === group.id)
      .reduce((sum, selection) => sum + selection.quantity, 0)
    if (picked < group.minSelections * quantity) return false
    if (group.maxSelections > 0 && picked > group.maxSelections * quantity) return false
  }
  return true
}

export function planReorder(items: ReorderItem[]): ReorderPlan {
  const lines: ReorderLine[] = []
  const skipped: ReorderSkipped[] = []

  for (const item of items) {
    const { product, quantity } = item
    const skip = (reason: ReorderSkipReason) =>
      skipped.push({ name: product.name, quantity, reason })

    if (!product.isAvailable || !product.isVisible) {
      skip('unavailable')
      continue
    }

    const currentChoice = (id: string) => (product.choices ?? []).find((choice) => choice.id === id)
    const ordered = item.selections ?? []
    let selections: ProductChoiceSelection[]
    let legacyChoice: ProductChoice | null = null

    if (ordered.length > 0) {
      selections = ordered.map((selection) => ({
        groupId: selection.groupId,
        choiceId: selection.choiceId,
        quantity: selection.quantity,
      }))
    } else if (item.choice) {
      // Old order with a single choice and no selections: it applies to every unit.
      legacyChoice = currentChoice(item.choice.id) ?? null
      if (!legacyChoice) {
        skip('choices')
        continue
      }
      // A choice without a group cannot be a selection (the API's `groupId` is a mandatory UUID and an empty one
      // fails the whole order): like the cart store does, it stays the plain legacy `choice` (a `choiceId` on the line).
      const { choiceGroupId } = legacyChoice
      selections =
        choiceGroupId !== undefined && choiceGroupId !== ''
          ? [{ groupId: choiceGroupId, choiceId: legacyChoice.id, quantity }]
          : []
    } else {
      selections = []
    }

    const goneOrMoved = selections.some((selection) => {
      const choice = currentChoice(selection.choiceId)
      return (
        !choice || (Boolean(choice.choiceGroupId) && choice.choiceGroupId !== selection.groupId)
      )
    })
    if (goneOrMoved || !groupsSatisfied(product, selections, quantity)) {
      skip('choices')
      continue
    }

    lines.push({ product, quantity, selections: sortSelections(selections), choice: legacyChoice })
  }

  return { lines, skipped }
}

/** Units across all lines (what the toast reports). */
export const countUnits = (entries: { quantity: number }[]): number =>
  entries.reduce((sum, entry) => sum + entry.quantity, 0)
