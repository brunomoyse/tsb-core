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

/**
 * THE canonical order of a line's selections (by group, then choice). Every place that stores,
 * compares or signs selections goes through this one comparator: two orders for the same
 * composition made a merged line impossible to find again (remove/+/- silently did nothing).
 * Plain code-unit comparison, not localeCompare, so it is the same on every device.
 */
export const compareSelections = (a: LineSelection, b: LineSelection): number => {
    const left = keyOf(a)
    const right = keyOf(b)
    return left < right ? -1 : left > right ? 1 : 0
}

/** The selections in canonical order (a copy). */
export const sortSelections = <T extends LineSelection>(selections: T[]): T[] =>
    selections.toSorted(compareSelections)

const sorted = sortSelections

/**
 * Order-insensitive identity of a line's own (line-wide) selections, used to find an existing
 * line again from the selections a cart surface hands back.
 */
export const selectionsSignature = (selections: LineSelection[]): string =>
    sorted(selections).map((s) => `${keyOf(s)}:${s.quantity}`).join('|')

/** True when `line` is the cart line of `productId` with exactly these selections (any order) and, when given, this quantity. */
export const matchesLine = (
    line: { product: { id: string }; quantity: number; selectedChoices?: LineSelection[] | null },
    lookup: { productId: string; selections: LineSelection[]; quantity?: number },
): boolean =>
    line.product.id === lookup.productId
    && selectionsSignature(line.selectedChoices ?? []) === selectionsSignature(lookup.selections)
    && (lookup.quantity === undefined || line.quantity === lookup.quantity)

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

/**
 * Unique v-for keys for a list of cart lines: the stable `cartLineKey`, with `#n` appended to the
 * 2nd, 3rd... line that would share it (duplicates can survive in an old persisted cart when a
 * merge would exceed the quantity cap), so Vue never sees a duplicate key.
 */
export function cartLineKeys(items: Parameters<typeof cartLineKey>[0][]): string[] {
    const seen = new Map<string, number>()
    return items.map((item) => {
        const key = cartLineKey(item)
        const n = seen.get(key) ?? 0
        seen.set(key, n + 1)
        return n === 0 ? key : `${key}#${n}`
    })
}

export interface PersistedCartLine<S extends LineSelection = LineSelection> {
    product: { id: string }
    quantity: number
    selectedChoices: S[]
    selectedChoice?: { id: string } | null
}

/**
 * Repairs lines of carts persisted by older builds, which stored a legacy single choice as
 * `[{ choiceId, quantity: 1 }]` whatever the line quantity (selection quantities are line-wide now,
 * so 3 bowls need `quantity: 3`), then merges lines that became the same line (same product and
 * per-unit composition). A merge that would exceed `max` is skipped so no unit is ever dropped.
 */
export function migratePersistedLines<T extends PersistedCartLine>(lines: T[], max: number): T[] {
    const repaired = lines.map((line) => {
        const only = line.selectedChoices.length === 1 ? line.selectedChoices[0]! : null
        if (line.selectedChoice && only && only.choiceId === line.selectedChoice.id && only.quantity === 1 && line.quantity > 1) {
            return { ...line, selectedChoices: [{ ...only, quantity: line.quantity }] }
        }
        return line
    })
    const result: T[] = []
    for (const line of repaired) {
        const signature = lineSignature(line.selectedChoices, line.quantity)
        const twin = result.find((other) => other.product.id === line.product.id
            && lineSignature(other.selectedChoices, other.quantity) === signature)
        const merged = twin
            ? mergeIntoLine(
                { quantity: twin.quantity, selections: twin.selectedChoices },
                { quantity: line.quantity, selections: line.selectedChoices },
                max,
            )
            : null
        if (twin && merged && merged.quantity === twin.quantity + line.quantity) {
            twin.quantity = merged.quantity
            twin.selectedChoices = merged.selections
        } else {
            result.push(line)
        }
    }
    return result
}
