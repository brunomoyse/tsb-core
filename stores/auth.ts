import { defineStore } from 'pinia'
import { useRuntimeConfig } from '#imports' // Import Nuxt runtime config
import type { User } from "@/types";

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: null as string | null,
    user: null as User | null
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
        const config = useRuntimeConfig(); // Get API base URL safely
        console.log(config.public)
        const response = await $fetch(`${config.public.server.apiBaseUrl}/auth/refresh`, {
          method: 'POST',
          credentials: 'include', // Sends HTTP-only refresh token cookie
        });

        if (response.accessToken) {
          this.setAccessToken(response.accessToken);
        }

        if (response.user) {
          this.setUser(response.user);
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        this.logout();
      }
    },
    logout() {
      this.accessToken = null;
      this.user = null;
    }
  },
  persist: true
});