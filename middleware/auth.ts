// middleware/auth.ts
import { defineNuxtRouteMiddleware, navigateTo } from '#imports'
import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(() => {
  const authStore = useAuthStore()

  if (!authStore.accessToken) {
    // If the user is not authenticated, redirect to /login
    return navigateTo('/login')
  }
})