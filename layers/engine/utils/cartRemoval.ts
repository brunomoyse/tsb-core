/*
 * Pure helpers of the cart removal flow (composables/useCartRemoval.ts).
 *
 * A removal always leaves an "X removed, Undo" toast. Removing a second line while that toast is
 * still on screen (or waiting its turn) does not replace the first Undo: both lines go into one
 * toast, "2 items removed", and its single Undo restores them all (audit finding M19).
 */

/** The toast group of every removal toast (see utils/toastQueue.ts). */
export const REMOVAL_TOAST_GROUP = 'cart-removal'

/**
 * The lines the next removal toast has to be able to restore: the earlier ones while their toast is
 * still alive, plus the line that was just removed; only the new line once the earlier toast is gone
 * (it expired, was closed or its Undo was used).
 */
export const nextRemovalBatch = <T>(batch: readonly T[], removed: T, toastAlive: boolean): T[] =>
    toastAlive ? [...batch, removed] : [removed]

/** Which message the toast shows for a batch: the line's name, or the count of lines. */
export const removalToastMessage = (count: number): 'one' | 'many' => (count <= 1 ? 'one' : 'many')
