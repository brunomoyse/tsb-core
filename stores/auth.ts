import type { User } from '@/types'
import { defineStore } from 'pinia'
import { useRuntimeConfig } from '#imports'
import { useTokenStore } from '~/composables/useTokenStore'

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
        updateUser(user: Partial<User>) {
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
            if (import.meta.client) {
                const config = useRuntimeConfig()
                // Skip localStorage timestamp for Capacitor — token store is the source of truth
                if (config.public.appBuild !== 'capacitor') {
                    if (valid) {
                        localStorage.setItem('token_expires', (Date.now() + 59*60*1000).toString());
                    } else {
                        localStorage.removeItem('token_expires');
                    }
                }
            }
        },
        async logout() {
            const config = useRuntimeConfig()
            const apiUrl = config.public.api as string
            const isCapacitor = config.public.appBuild === 'capacitor'

            try {
                if (isCapacitor) {
                    const tokenStore = useTokenStore()
                    const refreshToken = await tokenStore.getRefreshToken()
                    if (refreshToken) {
                        await $fetch(`${apiUrl}/logout`, {
                            method: 'POST',
                            credentials: 'omit',
                            body: { refreshToken },
                        })
                    }
                    await tokenStore.clearTokens()
                } else {
                    await $fetch(`${apiUrl}/logout`, {
                        method: 'POST',
                        credentials: 'include',
                    })
                }
            } catch (error) {
                if (import.meta.dev) console.error('Logout error:', error)
            } finally {
                this.user = null
                this.accessValid = false
                if (import.meta.client && !isCapacitor) {
                    localStorage.removeItem('token_expires')
                }
            }
        }
    },
    persist: true,
});
