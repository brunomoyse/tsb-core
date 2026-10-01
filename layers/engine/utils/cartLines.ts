/*
 * Pure helpers for the quantity of a cart line that carries choice selections.
 *
 * Selection quantities are LINE-WIDE (see pricing.ts): the backend multiplies each choice
 * group's min/max by the line quantity, so 2 bowls need 2 broths and the broth's selection
 * quantity is 2. Changing the line quantity therefore has to rescale the selections or the
 * backend rejects the order ("invalid number of selections for group …", audit finding M4).
 *
 * A line is rescalable only when its composition is uniform per unit, i.e. every selection
 * quantity is a whole multiple of the line quantity. A line like "2 bowls: 1× broth A + 1× broth
 * B" has no per-unit composition: it is left alone and has to be edited from the menu.
 */

export interface LineSelection {
    groupId: string
    choiceId: string
    quantity: number
}

const keyOf = (selection: LineSelection): string => `${selection.groupId}:${selection.choiceId}`

const sorted = <T extends LineSelection>(selections: T[]): T[] =>
    selections.toSorted((a, b) => keyOf(a).localeCompare(keyOf(b)))

/** The composition of ONE unit, or null when the line is not uniform per unit. */
export function perUnitSelections<T extends LineSelection>(selections: T[], quantity: number): T[] | null {
    if (!Number.isInteger(quantity) || quantity < 1) return null
    const perUnit: T[] = []
    for (const selection of selections) {
        if (selection.quantity % quantity !== 0) return null
        perUnit.push({ ...selection, quantity: selection.quantity / quantity })
    }
    return perUnit
}

/** The same per-unit composition on `newQuantity` units; null when the line cannot be rescaled. */
export function rescaleSelections<T extends LineSelection>(
    selections: T[],
    quantity: number,
    newQuantity: number,
): T[] | null {
    const perUnit = perUnitSelections(selections, quantity)
    if (!perUnit) return null
    return perUnit.map((selection) => ({ ...selection, quantity: selection.quantity * newQuantity }))
}

/** True when the +/- of the line can keep it valid (no selections, or a uniform per-unit composition). */
export const canChangeLineQuantity = (selections: LineSelection[] | null | undefined, quantity: number): boolean =>
    (selections?.length ?? 0) === 0 || perUnitSelections(selections ?? [], quantity) !== null

/**
 * Identity of a line's composition for merging: per UNIT when the line is uniform, so one bowl
 * with broth A and two bowls with broth A are the same line (2 bowls = 2× the 1-bowl selections).
 * A non-uniform line only ever equals an identical non-uniform line of the same quantity.
 */
export function lineSignature(selections: LineSelection[], quantity: number): string {
    if (selections.length === 0) return ''
    const perUnit = perUnitSelections(selections, quantity)
    const parts = (perUnit ? sorted(perUnit) : sorted(selections)).map((s) => `${keyOf(s)}:${s.quantity}`)
    return perUnit ? parts.join('|') : `~${quantity}~${parts.join('|')}`
}

/** Element-wise sum of two selection lists (used to merge two identical non-uniform lines). */
export function addSelections<T extends LineSelection>(a: T[], b: T[]): T[] {
    const totals = new Map<string, T>()
    for (const selection of [...a, ...b]) {
        const existing = totals.get(keyOf(selection))
        totals.set(keyOf(selection), existing
            ? { ...existing, quantity: existing.quantity + selection.quantity }
            : { ...selection })
    }
    return sorted([...totals.values()])
}

export interface MergedLine<T extends LineSelection> {
    quantity: number
    selections: T[]
}

/**
 * Result of adding `added` (units + selections) to an existing line of the same signature
 * (see `lineSignature`), capped at `max` units. Uniform lines keep their per-unit composition on
 * the new quantity, so the selections always match the quantity; identical non-uniform lines
 * just add up. Null when the line cannot absorb the units (non-uniform, over the cap): the caller
 * starts a new line instead.
 */
export function mergeIntoLine<T extends LineSelection>(
    line: MergedLine<T>,
    added: MergedLine<T>,
    max: number,
): MergedLine<T> | null {
    const total = line.quantity + added.quantity
    if (line.selections.length === 0) return { quantity: Math.min(total, max), selections: [] }
    const rescaled = rescaleSelections(line.selections, line.quantity, Math.min(total, max))
    if (rescaled) return { quantity: Math.min(total, max), selections: rescaled }
    if (total > max) return null
    return { quantity: total, selections: addSelections(line.selections, added.selections) }
}

/**
 * Stable v-for / highlight key of a cart line: it does not change when +/- rescales the line,
 * so the buttons keep their DOM node (and focus) while the quantity changes.
 */
export const cartLineKey = (item: {
    product: { id: string }
    quantity: number
    selectedChoices?: LineSelection[] | null
    selectedChoice?: { id: string } | null
}): string =>
    `${item.product.id}-${lineSignature(item.selectedChoices ?? [], item.quantity) || (item.selectedChoice?.id ?? 'none')}`
