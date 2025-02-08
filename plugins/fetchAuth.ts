import { useAuthStore } from "@/stores/auth";

export default defineNuxtPlugin((nuxtApp) => {
  const authStore = useAuthStore();

  // Save the original fetch function
  const originalFetch = globalThis.$fetch;

  // Define the new fetch function
  const newFetch = async (
    url: string | URL,
    options: RequestInit = {}
  ): Promise<any> => {
    options.headers = options.headers || {};

    console.log("Auth Plugin Intercepting Request:", url.toString()); // Debugging

    if (authStore.accessToken) {
      (options.headers as HeadersInit)[
        "Authorization"
      ] = `Bearer ${authStore.accessToken}`;
    }

    try {
      return await originalFetch(url.toString(), options);
    } catch (error: any) {
      if (error.status === 401) {
        console.warn("Access token expired, attempting to refresh...");
        try {
          const newAccessToken = await refreshAccessToken(authStore);
          if (newAccessToken) {
            (options.headers as HeadersInit)[
              "Authorization"
            ] = `Bearer ${newAccessToken}`;
            return await originalFetch(url.toString(), options); // Retry with refreshed token
          }
        } catch (refreshError) {
          console.error("Session expired, logging out...");
          authStore.logout();
          return navigateTo("/login");
        }
      }
      throw error;
    }
  };

  // ✅ Correctly override `$fetch` globally
  globalThis.$fetch = newFetch;
});

// Helper function to refresh the access token
async function refreshAccessToken(
  authStore: ReturnType<typeof useAuthStore>
): Promise<string | null> {
  try {
    const { $apiBaseUrl } = useNuxtApp();

    const response = await $fetch<{ accessToken: string }>(
      `${$apiBaseUrl()}/auth/refresh`,
      {
        method: "POST",
        credentials: "include", // Sends refresh token from HTTP-only cookie
      }
    );
    authStore.setAccessToken(response.accessToken);
    return response.accessToken;
  } catch (error) {
    console.error("Failed to refresh access token:", error);
    return null;
  }
}
