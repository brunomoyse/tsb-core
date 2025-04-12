// plugins/sse.client.ts
import { defineNuxtPlugin, useRuntimeConfig } from '#imports'
import { ref } from 'vue'
import type { EventData } from '@/types'

export default defineNuxtPlugin((nuxtApp) => {
    const config = useRuntimeConfig()
    const sseUrl = (config.public.api as string) + '/sse'
    const events = ref<EventData[]>([]) // This reactive ref will hold an array of events.

    let eventSource: EventSource | null = null

    nuxtApp.hook('app:mounted', () => {
        eventSource = new EventSource(sseUrl, { withCredentials: true })
        eventSource.onmessage = (ev) => {
            try {
                const data: EventData = JSON.parse(ev.data)
                events.value.push(data)
            } catch (err) {
                console.error('Error parsing SSE message:', err)
            }
        }
        eventSource.onerror = (err) => {
            console.error('SSE error:', err)
        }
    })

    // Use a global window event listener to clean up the connection.
    if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', () => {
            if (eventSource) {
                eventSource.close()
                eventSource = null
            }
        })
    }

    return {
        provide: {
            sse: {
                events // Expose the reactive events array as $sse.events.
            }
        }
    }
})
