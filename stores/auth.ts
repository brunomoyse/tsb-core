import {defineStore} from "pinia";
import type {User} from "@/types";

export const useAuthStore = defineStore("auth", {
    state: () => ({
        accessToken: null as string | null,
        user: null as User | null,
    }),
    actions: {
        setAccessToken(token: string | null) {
            this.accessToken = token;
        },
        setUser(user: User) {
            this.user = user;
        },
        async logout(config?: { apiUrl: string }) {
            try {
                // Only attempt token revocation if we have a config
                if (config?.apiUrl) {
                    await $fetch('/tokens/revoke', {
                        baseURL: config.apiUrl,
                        method: 'POST',
                        credentials: 'include'
                    })
                }
            } catch (error) {
                console.error('Revocation error:', error)
            } finally {
                this.accessToken = null
            }
        }
    },
    persist: true,
});
