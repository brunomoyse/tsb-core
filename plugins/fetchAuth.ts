// @ts-nocheck
// plugins/fetchAuth.ts
import { defineNuxtPlugin } from "#app";
import { useAuthStore } from "@/stores/auth";
import { useRuntimeConfig } from "#imports";

export default defineNuxtPlugin(() => {
  const authStore = useAuthStore();
  const config = useRuntimeConfig();
  const originalFetch = globalThis.$fetch;
  let refreshPromise: Promise<string | null> | null = null;

  async function refreshAccessToken(): Promise<string | null> {
    try {
      console.log('Attempting token refresh...');
      const data = await originalFetch(`${config.public.server.apiBaseUrl}/tokens/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { 
          "Content-Type": "application/json",
        },
      });
      
      if (!data?.accessToken) {
        console.error('No access token in response');
        return null;
      }

      console.log('New access token received');
      authStore.setAccessToken(data.accessToken);
      authStore.setUser(data.user);
      return data.accessToken;

    } catch (error) {
      console.error("Refresh failed completely:", error);
      authStore.setAccessToken(null);
      authStore.setUser(null);
      return null;
    }
  }

  async function attemptRefresh(): Promise<string | null> {
    if (refreshPromise) return refreshPromise;
    
    refreshPromise = refreshAccessToken()
      .finally(() => {
        refreshPromise = null;
      });

    return refreshPromise;
  }

  const newFetch = async (input: string, init: RequestInit = {}) => {
    const url = input.toString();
    const headers = new Headers(init.headers);
    let retryCount = 0;

    const executeRequest = async (): Promise<Response> => {
      if (authStore.accessToken) {
        headers.set('Authorization', `Bearer ${authStore.accessToken}`);
      }

      try {
        const response = await originalFetch(url, {
          ...init,
          headers,
          credentials: "include"
        });

        if (response.status === 401 && retryCount === 0) {
          retryCount++;
          const newToken = await attemptRefresh();
          
          if (newToken) {
            headers.set('Authorization', `Bearer ${newToken}`);
            return executeRequest();
          }
        }

        return response;

      } catch (error: any) {
        if (error.status === 401 && retryCount === 0) {
          retryCount++;
          const newToken = await attemptRefresh();
          
          if (newToken) {
            headers.set('Authorization', `Bearer ${newToken}`);
            return executeRequest();
          }
        }
        throw error;
      }
    };

    return executeRequest();
  };

  globalThis.$fetch = newFetch;
});