import { useAuthStore } from "@/stores/auth";

export default defineNuxtPlugin((nuxtApp) => {
  const authStore = useAuthStore();

  // Save the original fetch function
  const originalFetch = globalThis.$fetch;

  // Define the new fetch function
  const newFetch = async (
    input: string | URL,
    init: RequestInit = {}
  ): Promise<any> => {
    // Convert the input to a string (in case it's a URL object)
    const url = typeof input === "string" ? input : input.toString();

    // 1. Only intercept if the URL starts with http://localhost:8080/user/
    const interceptPattern = "http://localhost:8080/user/";
    if (!url.startsWith(interceptPattern)) {
      // 2. For everything else, just use the original fetch unchanged
      return originalFetch(url, init);
    }

    // If we get here, it's an API call we want to intercept

    // Ensure headers is defined
    init.headers = init.headers || {};

    console.log("Auth Plugin Intercepting Request:", url); // Debugging

    // If we have an accessToken, attach it
    if (authStore.accessToken) {
      (init.headers as HeadersInit)["Authorization"] = `Bearer ${authStore.accessToken}`;
    }

    try {
      return await originalFetch(url, init);
    } catch (error: any) {
      // If we got a 401, attempt token refresh
      if (error.status === 401) {
        console.warn("Access token expired, attempting to refresh...");
        try {
          const newAccessToken = await refreshAccessToken(authStore);
          if (newAccessToken) {
            // Update headers with the new access token and retry
            (init.headers as HeadersInit)["Authorization"] = `Bearer ${newAccessToken}`;
            return await originalFetch(url, init);
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

  // Override $fetch globally
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