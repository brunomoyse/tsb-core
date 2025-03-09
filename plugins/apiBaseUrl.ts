import {defineNuxtPlugin, useRuntimeConfig} from "#imports";

export default defineNuxtPlugin((nuxtApp) => {
    const config = useRuntimeConfig();

    // Explicitly specify the return type as string
    function getApiBaseUrl(): string {
        return config.public.api as string;
    }

    nuxtApp.provide("apiBaseUrl", getApiBaseUrl);
});
