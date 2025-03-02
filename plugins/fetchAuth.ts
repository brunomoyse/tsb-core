// @ts-nocheck
// plugins/fetchAuth.ts
import { defineNuxtPlugin, useNuxtApp, useRequestEvent } from "#app";
import { useAuthStore } from "@/stores/auth";
import { useRuntimeConfig } from "#imports";

export default defineNuxtPlugin(() => {
  const authStore = useAuthStore();
  const config = useRuntimeConfig();
  const originalFetch = globalThis.$fetch;
  let refreshPromise: Promise<string | null> | null = null;

  function hasRefreshTokenCookie(): boolean {
    // Client-side check
    if (process.client) {
      return document.cookie.split(';').some((cookie) => {
        return cookie.trim().startsWith('refresh_token=');
      });
    }

    // Server-side check
    if (process.server) {
      const { req } = useRequestEvent();
      if (!req?.headers?.cookie) {
        return false;
      }
      return req.headers.cookie.split(';').some((cookie) => {
        return cookie.trim().startsWith('refresh_token=');
      });
    }

    // Fallback
    return false;
  }

  async function refreshAccessToken(): Promise<string | null> {
    // Only attempt refresh if cookie exists
    if (!hasRefreshTokenCookie()) {
      console.log('No refresh token cookie found, skipping refresh');
      return null;
    }

    try {
      const response = await window.fetch(
        `${config.public.server.apiBaseUrl}/tokens/refresh`,
        {
          method: "POST",
          credentials: "include",
          headers: { 
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.accessToken;
    } catch (error) {
      console.error("Failed to refresh access token:", error);
      return null;
    }
  }

  async function attemptRefresh(): Promise<string | null> {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
      try {
        const newToken = await refreshAccessToken();
        if (newToken) authStore.setAccessToken(newToken);
        return newToken;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  }

  const newFetch = async (
    input: string | URL,
    init: RequestInit = {}
  ): Promise<any> => {
    const url = typeof input === "string" ? input : input.toString();
    const headers = { ...init.headers };

    // Initial token attachment
    if (authStore.accessToken) {
      headers["Authorization"] = `Bearer ${authStore.accessToken}`;
    } else if (hasRefreshTokenCookie()) {
      // Only attempt refresh if refresh token cookie exists
      const newToken = await attemptRefresh();
      if (newToken) headers["Authorization"] = `Bearer ${newToken}`;
    }

    try {
      return await originalFetch(url, { ...init, headers });
    } catch (error: any) {
      if (error.status === 401 && hasRefreshTokenCookie()) {
        console.warn("Access token expired; attempting to refresh...");
        const newToken = await attemptRefresh();

        if (newToken) {
          return originalFetch(url, {
            ...init,
            headers: { ...headers, Authorization: `Bearer ${newToken}` },
          });
        } else {
          const { Authorization, ...cleanHeaders } = headers;
          return originalFetch(url, { ...init, headers: cleanHeaders });
        }
      }
      throw error;
    }
  };

  globalThis.$fetch = newFetch;
});