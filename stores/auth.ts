import {defineStore} from "pinia";
import type {User} from "@/types";

export const useAuthStore = defineStore("auth", {
    state: () => ({
        user: null as User | null,
        accessValid: false
    }),

    actions: {
        setUser(user: User) {
            this.user = user;
            this.accessValid = true;
        },
        updateUser(user: User) {
            if (this.user) {
                Object.assign(this.user, user);
            } else {
                this.user = user;
            }
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
        async logout() {
            const apiUrl = useRuntimeConfig().public.api as string
            try {
                await $fetch(`${apiUrl}/logout`, {
                    method: 'POST',
                    credentials: 'include',
                })
            } catch (error) {
                console.error('Logout error:', error)
            } finally {
                this.user = null
                this.accessValid = false
                localStorage.removeItem('token_expires')
            }
        }
    },
    persist: true,
});
