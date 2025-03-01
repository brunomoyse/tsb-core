import { defineStore } from "pinia";
import { useRuntimeConfig } from "#imports"; // Import Nuxt runtime config
import type { User } from "@/types";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    accessToken: null as string | null,
    user: null as User | null,
  }),
  actions: {
    setAccessToken(token: string) {
      this.accessToken = token;
    },
    setUser(user: User) {
      this.user = user;
    },
    async refreshAccessToken() {
      try {
        const config = useRuntimeConfig();

        const response: { accessToken?: string; user?: User } = await $fetch(
          /* @ts-ignore */
          `${config.public.server.apiBaseUrl}/tokens/refresh`,
          {
            method: "POST",
            credentials: "include", // Sends HTTP-only refresh token cookie
          }
        );

        if (response.accessToken) {
          this.setAccessToken(response.accessToken);
        }

        if (response.user) {
          this.setUser(response.user);
        }
      } catch (error) {
        console.error("Token refresh failed:", error);
        this.logout();
      }
    },
    async logout() {
      try {
        const config = useRuntimeConfig();

        // Call the backend endpoint to revoke tokens.
        /* @ts-ignore */
        await $fetch(`${config.public.server.apiBaseUrl}/tokens/revoke`, {
          method: "POST",
          credentials: "include",
        });
      } catch (error) {
        console.error("Failed to revoke tokens:", error);
        // Depending on your needs, you might want to handle this error
        // or continue to clear the client-side session anyway.
      }

      // Clear authentication state.
      this.accessToken = null;
      this.user = null;

      // Optionally, reload the page or redirect to a public route.
      // window.location.reload();
    },
  },
  persist: true,
});
