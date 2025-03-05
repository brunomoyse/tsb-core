import { defineNuxtPlugin, useRuntimeConfig } from "#imports";

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();

  // Explicitly specify the return type as string
  function getApiBaseUrl(): string {
    if (process.server && !process.dev) {
      // @ts-expect-error type is not defined
      return config.public.server.apiBaseUrl as string;
    } else {
      // @ts-expect-error type is not defined
      return config.public.client.apiBaseUrl as string;
    }
  }

  // Provide the function that always returns a string
  nuxtApp.provide("apiBaseUrl", getApiBaseUrl);
});