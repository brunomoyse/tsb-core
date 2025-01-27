export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();
  nuxtApp.provide("apiBaseUrl", () => {
    if (process.server && !process.dev) {
      return config.public.server.apiBaseUrl;
    } else {
      return config.public.client.apiBaseUrl;
    }
  });
});
