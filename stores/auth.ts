import { defineStore } from 'pinia'
import type { User } from "@/types";

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: null as string | null,
    user: null as User | null
  }),
  actions: {
    setAccessToken(token: string) {
      this.accessToken = token
    },
    setUser(user: User) {
      this.user = user
    },
    logout() {
      this.accessToken = null
      this.user = null
    }
  },
  persist: true
})