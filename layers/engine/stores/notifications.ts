import type { Notification, NotifyPayload } from '@/types'
import { defineStore } from 'pinia'

interface NotificationsState {
    current: Notification | null;
    seq: number;
    dismissTimer: ReturnType<typeof setTimeout> | null;
}

export const useNotificationsStore = defineStore('notifications', {
    state: (): NotificationsState => ({
        current: null,
        seq: 0,
        dismissTimer: null,
    }),

    actions: {
        notify(payload: NotifyPayload): void {
            if (this.dismissTimer) {
                clearTimeout(this.dismissTimer)
                this.dismissTimer = null
            }

            this.current = {
                message: payload.message,
                persistent: payload.persistent ?? false,
                duration: payload.duration ?? 5000,
                variant: payload.variant ?? 'neutral',
                action: payload.action,
            }
            this.seq += 1

            if (!this.current.persistent) {
                this.dismissTimer = setTimeout(() => {
                    this.current = null
                    this.dismissTimer = null
                }, this.current.duration)
            }
        },

        dismiss(): void {
            if (this.dismissTimer) {
                clearTimeout(this.dismissTimer)
                this.dismissTimer = null
            }
            this.current = null
        },
    },
})
