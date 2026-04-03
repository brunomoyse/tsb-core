declare module '#app' {
    interface NuxtApp {
        $api: <T = any>(request: string, options?: Record<string, any>) => Promise<T>;
        $gqlFetch: <T>(query: string, variables?: Record<string, unknown>) => Promise<T>;
    }
}
