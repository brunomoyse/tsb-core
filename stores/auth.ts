import {defineStore} from "pinia";
import type {User} from "@/types";

export const useAuthStore = defineStore("auth", {
    state: () => ({
        user: null as User | null,
        accessValid: false
    }),

    getters: {
        deliveryFee(): number {
            // @TODO: Calculate depending on user's address
            return 3.5;
        }
    },

    actions: {
        setUser(user: User) {
            this.user = user;
            this.accessValid = true;
        },
        clearUser() {
            this.user = null
            this.accessValid = false
        },
        setAccessValid(valid: boolean) {
            this.accessValid = valid
            if (valid) {
                localStorage.setItem('token_expires', (Date.now() + 14*60*1000).toString());
            } else {
                localStorage.removeItem('token_expires');
            }
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
                this.accessValid = false
            }
        }
    },
    persist: true,
});
