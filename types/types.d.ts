// types.d.ts (or similar file)
import type { PostHog } from 'posthog-js'

declare module '#app' {
    interface NuxtApp {
        $api: ReturnType<typeof $fetch.create>;
        $gqlFetch: <T>(query: string, variables?: Record<string, unknown>) => Promise<T>;
        $posthog: PostHog | null;
    }
}
