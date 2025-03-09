// types.d.ts or similar file
// eslint-disable-next-line
// eslint-disable-next-line

declare module '#app' {
    interface NuxtApp {
        $apiBaseUrl: () => string;
        $api: ReturnType<typeof $fetch.create>
        $refreshToken: () => Promise<RefreshTokenResponse | null>;
    }
}
