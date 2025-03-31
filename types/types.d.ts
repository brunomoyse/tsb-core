// types.d.ts or similar file

declare module '#app' {
    interface NuxtApp {
        $api: ReturnType<typeof $fetch.create>
    }
}
