// types.d.ts or similar file

declare module '#app' {
    interface NuxtApp {
        $apiBaseUrl: () => string;
        $api: ReturnType<typeof $fetch.create>
        $refreshToken: () => Promise<RefreshTokenResponse | null>;
    }
}
