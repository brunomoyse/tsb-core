import type { User } from '@/types'
import { defineStore } from 'pinia'

export const useAuthStore = defineStore("auth", {
    state: () => ({
        user: null as User | null,
    }),

    actions: {
        setUser(user: User) {
            this.user = user
        },
        updateUser(user: Partial<User>) {
            if (this.user) {
                Object.assign(this.user, user)
            } else {
                this.user = user
            }
        },
        clearUser() {
            this.user = null
        },
        async logout() {
            // Clear state BEFORE the redirect (signOut triggers window.location change)
            this.user = null
            // Also force-clear localStorage since pinia-persist may not flush in time
            if (import.meta.client) {
                localStorage.removeItem('auth')
            }
            try {
                const { useOidc } = await import('~/composables/useOidc')
                const { useRuntimeConfig } = await import('#imports')
                const config = useRuntimeConfig()
                if (config.public.appBuild === 'capacitor') {
                    const { logoutCapacitor } = useOidc()
                    logoutCapacitor()
                } else {
                    const { signOut } = useOidc()
                    await signOut()
                }
            } catch (error) {
                if (import.meta.dev) console.error('Logout error:', error)
            }
        }
    },
    persist: true,
});
