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
                const { signOut } = useOidc()
                await signOut()
            } catch (error) {
                if (import.meta.dev) console.error('Logout error:', error)
            }
        },
        /*
         * Force-logout after account deletion. Unlike logout(), this does NOT hit
         * Zitadel's end-session endpoint: the Zitadel identity has just been
         * deleted, so a signOut() round-trip is pointless and could error. We only
         * wipe the local session — the access token stays cryptographically valid
         * until it expires, so clearing it locally is what actually logs the user
         * out. The caller redirects afterwards.
         */
        async deleteAccountSession() {
            this.user = null
            if (import.meta.client) {
                localStorage.removeItem('auth')
            }
            try {
                const { useOidc } = await import('~/composables/useOidc')
                const { removeUser } = useOidc()
                await removeUser()
            } catch (error) {
                if (import.meta.dev) console.error('Delete-account session clear error:', error)
            }
        }
    },
    /*
     * Explicit localStorage. `pinia-plugin-persistedstate/nuxt` defaults to
     * cookies; the OIDC tokens already live in localStorage (see useOidc), and
     * `logout()` above force-clears `localStorage.removeItem('auth')`, so we
     * keep the persisted user record in the same storage to avoid double-write
     * quirks where SSR hydration could resurrect a stale cookie copy.
     */
    persist: {
        storage: {
            getItem: (key) => (import.meta.client ? window.localStorage.getItem(key) : null),
            setItem: (key, value) => {
                if (import.meta.client) window.localStorage.setItem(key, value)
            },
        },
    },
});
