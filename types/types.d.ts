// types.d.ts (or similar file)
import type { EventData } from '@/types'
import type { Ref } from 'vue'

export interface SSE {
    events: Ref<EventData[]>;
}

declare module '#app' {
    interface NuxtApp {
        $api: ReturnType<typeof $fetch.create>;
        $sse: SSE;
    }
}
