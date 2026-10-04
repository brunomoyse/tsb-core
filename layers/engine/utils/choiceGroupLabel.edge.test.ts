import { describe, expect, it } from 'vite-plus/test'
import { choiceGroupLabelKey } from './choiceGroupLabel'

const labels = { bowls: { one: 'choice.broth', other: 'choice.broths' } }

describe('choiceGroupLabelKey', () => {
  it('singular for a pick-one group, plural for a multi-select one', () => {
    expect(choiceGroupLabelKey(labels, 'bowls', 1)).toBe('choice.broth')
    expect(choiceGroupLabelKey(labels, 'bowls', 3)).toBe('choice.broths')
  })

  it('is null when the brand has no labels, no label for the category, or the product has no category', () => {
    expect(choiceGroupLabelKey(undefined, 'bowls', 1)).toBeNull()
    expect(choiceGroupLabelKey(labels, 'drinks', 1)).toBeNull()
    expect(choiceGroupLabelKey(labels, null, 1)).toBeNull()
    expect(choiceGroupLabelKey(labels, undefined, 1)).toBeNull()
    expect(choiceGroupLabelKey(labels, '', 1)).toBeNull()
  })
})
