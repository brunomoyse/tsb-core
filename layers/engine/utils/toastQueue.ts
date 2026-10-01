/*
 * The queue behind the toast host (stores/notifications.ts), kept pure so it can be tested.
 *
 * One toast is shown at a time; the others wait their turn (a second toast used to replace the
 * first one, so removing two cart lines quickly lost the first "Undo", audit finding M19).
 *
 *  - `group`: a toast of the same group as the one showing (or waiting) REPLACES it instead of
 *    queueing behind it. The caller puts the combined content in the new toast, e.g. "2 items
 *    removed" with one Undo that restores both.
 *  - the same message again, while it is showing or waiting, is not announced twice.
 *  - the queue is bounded: past MAX_QUEUED_TOASTS the oldest waiting toast without an action goes.
 */

export const MAX_QUEUED_TOASTS = 5

export interface QueuedToast {
    id: number
    message: string
    variant: string
    group?: string
    /** Toasts with an action (Undo) are the last to be dropped from a full queue. */
    action?: unknown
}

export interface ToastQueueState<T extends QueuedToast> {
    current: T | null
    queue: T[]
}

export interface EnqueueResult<T extends QueuedToast> extends ToastQueueState<T> {
    /** The toast on screen changed (new, or replaced in place): its timer starts over. */
    currentChanged: boolean
    /** An identical toast is already showing: nothing was added, its timer starts over. */
    restartCurrent: boolean
}

const hasAction = (toast: QueuedToast): boolean => toast.action !== undefined

const sameAnnouncement = (a: QueuedToast, b: QueuedToast): boolean =>
    a.message === b.message && a.variant === b.variant && !hasAction(a) && !hasAction(b)

export function enqueueToast<T extends QueuedToast>(state: ToastQueueState<T>, toast: T): EnqueueResult<T> {
    const { current, queue } = state

    if (!current) return { current: toast, queue, currentChanged: true, restartCurrent: false }

    if (toast.group !== undefined && current.group === toast.group) {
        return { current: toast, queue, currentChanged: true, restartCurrent: false }
    }
    const waiting = toast.group === undefined ? -1 : queue.findIndex((queued) => queued.group === toast.group)
    if (waiting !== -1) {
        return { current, queue: queue.map((queued, index) => (index === waiting ? toast : queued)), currentChanged: false, restartCurrent: false }
    }

    if (sameAnnouncement(current, toast)) return { current, queue, currentChanged: false, restartCurrent: true }
    if (queue.some((queued) => sameAnnouncement(queued, toast))) return { current, queue, currentChanged: false, restartCurrent: false }

    let next = [...queue, toast]
    if (next.length > MAX_QUEUED_TOASTS) {
        const droppable = next.findIndex((queued) => !hasAction(queued))
        next = next.filter((_, index) => index !== (droppable === -1 ? 0 : droppable))
    }
    return { current, queue: next, currentChanged: false, restartCurrent: false }
}

/** The current toast is gone (closed, expired, undone): the next one takes its place. */
export function advanceToast<T extends QueuedToast>(state: ToastQueueState<T>): ToastQueueState<T> {
    const [next, ...rest] = state.queue
    return { current: next ?? null, queue: rest }
}

/** True while a toast of this group is showing or waiting. */
export const hasToastGroup = <T extends QueuedToast>(state: ToastQueueState<T>, group: string): boolean =>
    state.current?.group === group || state.queue.some((queued) => queued.group === group)
