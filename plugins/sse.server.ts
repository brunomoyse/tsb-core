// plugins/sse.server.ts
import { defineNuxtPlugin, ref } from '#imports'

interface EventData {
    event: string
    orderID: string
    timestamp: string
    newStatus: string
}

export default defineNuxtPlugin(() => {
    // Provide a dummy version for SSR to prevent errors.
    return {
        provide: {
            sse: {
                events: ref<EventData[]>([]) // an empty array that won't change
            }
        }
    }
})
