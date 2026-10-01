import type { Notification, NotifyPayload } from '@/types'
import { advanceToast, enqueueToast, hasToastGroup } from '#engine/utils/toastQueue'
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
 * The expiry timer of the toast on screen. Module scope, client only: a setTimeout handle is not
 * serialisable state (audit L4) and must never reach the Pinia state or the SSR payload.
 * `remaining` is what is left of the duration while the timer is paused (hover / focus on the toast).
 */
let timer: ReturnType<typeof setTimeout> | null = null
let startedAt = 0
let remaining = 0
let paused = false

const MIN_RESUME_MS = 1000

const clearTimer = (): void => {
    if (timer) clearTimeout(timer)
    timer = null
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
            clearTimer()
            paused = false
            const next = advanceToast({ current: this.current, queue: this.queue })
            this.queue = next.queue
            if (next.current) this.show(next.current)
            else this.current = null
        },

        /** Hover or focus on the toast: the clock stops, so a toast being read (or an Undo being reached) does not vanish. */
        pause(): void {
            if (!timer) return
            remaining -= Date.now() - startedAt
            clearTimer()
            paused = true
        },

        /** The pointer and the focus left the toast: the rest of its time runs. */
        resume(): void {
            if (!paused) return
            paused = false
            if (!this.current || this.current.persistent) return
            this.armTimer(Math.max(remaining, MIN_RESUME_MS))
        },

        /** True while a toast of this group is showing or waiting. */
        hasGroup(group: string): boolean {
            return hasToastGroup({ current: this.current, queue: this.queue }, group)
        },

        show(toast: Notification): void {
            this.current = toast
            this.seq += 1
            paused = false
            this.armTimer()
        },

        armTimer(ms?: number): void {
            clearTimer()
            if (!import.meta.client || !this.current || this.current.persistent) return
            remaining = ms ?? this.current.duration
            startedAt = Date.now()
            timer = setTimeout(() => this.dismiss(), remaining)
        },
    },
})
