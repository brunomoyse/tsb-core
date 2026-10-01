import type { Notification, NotifyPayload } from '@/types'
import { advanceToast, enqueueToast, hasToastGroup } from '#engine/utils/toastQueue'
import { createToastTimer } from '#engine/utils/toastTimer'
import { defineStore } from 'pinia'

interface NotificationsState {
    /** The toast on screen. */
    current: Notification | null;
    /** The toasts waiting their turn, oldest first. */
    queue: Notification[];
    /** Bumped every time the toast on screen changes, so the host re-mounts (and re-animates) it. */
    seq: number;
}

/*
 * The expiry clock of the toast on screen (see utils/toastTimer.ts). Module scope, client only: a setTimeout
 * handle is not serialisable state (audit L4) and must never reach the Pinia state or the SSR payload.
 * It pauses while the toast is hovered or focused, and that pause survives a replacement or a restart.
 */
let clock: ReturnType<typeof createToastTimer> | null = null
let expire: (() => void) | null = null
const getClock = (dismiss: () => void) => {
    expire = dismiss
    return (clock ??= createToastTimer(() => expire?.()))
}

let nextId = 1

export const useNotificationsStore = defineStore('notifications', {
    state: (): NotificationsState => ({
        current: null,
        queue: [],
        seq: 0,
    }),

    actions: {
        /**
         * Shows a toast: at once when none is showing, after the others otherwise (see utils/toastQueue.ts
         * for the grouping and de-duplication rules). Returns the toast's id.
         */
        notify(payload: NotifyPayload): number {
            const toast: Notification = {
                id: nextId++,
                message: payload.message,
                persistent: payload.persistent ?? false,
                duration: payload.duration ?? 5000,
                variant: payload.variant ?? 'neutral',
                action: payload.action,
                group: payload.group,
            }
            const result = enqueueToast({ current: this.current, queue: this.queue }, toast)
            this.queue = result.queue
            if (result.currentChanged && result.current) {
                this.show(result.current)
            } else if (result.restartCurrent) {
                this.armTimer()
            }
            return toast.id
        },

        /** Closes the toast on screen (closed, expired or its action ran); the next one takes its place. */
        dismiss(): void {
            clock?.stop()
            const next = advanceToast({ current: this.current, queue: this.queue })
            this.queue = next.queue
            if (next.current) this.show(next.current)
            else this.current = null
        },

        /** Hover or focus on the toast: the clock stops, so a toast being read (or an Undo being reached) does not vanish. */
        pause(): void {
            clock?.pause()
        },

        /** The pointer and the focus left the toast: the rest of its time runs. */
        resume(): void {
            if (!this.current || this.current.persistent) {
                clock?.stop()
                return
            }
            clock?.resume()
        },

        /** True while the clock is stopped because the toast is being read (or held after a replacement). */
        isPaused(): boolean {
            return clock?.paused ?? false
        },

        /** True while a toast of this group is showing or waiting. */
        hasGroup(group: string): boolean {
            return hasToastGroup({ current: this.current, queue: this.queue }, group)
        },

        show(toast: Notification): void {
            this.current = toast
            this.seq += 1
            this.armTimer()
        },

        armTimer(): void {
            if (!import.meta.client || !this.current) return
            const timer = getClock(() => this.dismiss())
            if (this.current.persistent) timer.hold()
            else timer.start(this.current.duration)
        },
    },
})
