// Types.d.ts (or similar file)
import type { PostHog } from 'posthog-js'

declare module '#app' {
    interface NuxtApp {
        $api: <T = any>(request: string, options?: Record<string, any>) => Promise<T>;
        $gqlFetch: <T>(query: string, variables?: Record<string, unknown>) => Promise<T>;
        $posthog: PostHog | null;
    }
}
