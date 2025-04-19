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
                this.user = user
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
            try {
                // @TODO: To implement
            } catch (error) {
                console.error('Token evocation error:', error)
            } finally {
                this.accessValid = false
            }
        }
    },
    persist: true,
});
