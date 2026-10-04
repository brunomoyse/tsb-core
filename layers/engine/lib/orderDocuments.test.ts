// ORDER_ITEMS_SELECTION is spliced into three GraphQL documents: it must stay one balanced selection that asks for what
// The reorder / receipt code reads, and must not ask for the selection fields the API never fills (it fails the order).
import { describe, expect, it } from 'vite-plus/test'
import { ORDER_ITEMS_SELECTION } from './orderDocuments'

describe('ORDER_ITEMS_SELECTION', () => {
  it('is a balanced selection set starting with items', () => {
    expect(ORDER_ITEMS_SELECTION.startsWith('items {')).toBe(true)
    const open = ORDER_ITEMS_SELECTION.split('{').length - 1
    const close = ORDER_ITEMS_SELECTION.split('}').length - 1
    expect(open).toBe(close)
  })

  it('asks for the line amounts, the product with its choices and groups, and the selections by ids only', () => {
    for (const field of ['unitPrice', 'quantity', 'totalPrice', 'choices {', 'choiceGroups {']) {
      expect(ORDER_ITEMS_SELECTION).toContain(field)
    }
    expect(ORDER_ITEMS_SELECTION).toContain('selections { groupId choiceId quantity }')
  })

  it('never selects the non-null-but-unfilled selection.choice / selection.group', () => {
    expect(ORDER_ITEMS_SELECTION).not.toMatch(/selections\s*\{[^}]*\b(choice|group)\s*\{/u)
  })
})
