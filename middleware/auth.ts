import { useAuthStore } from '@/stores/auth'
const { $apiBaseUrl } = useNuxtApp()

export default defineNuxtRouteMiddleware(async () => {
    const authStore = useAuthStore()
  
    // If there is no access token, try to refresh
    if (!authStore.accessToken) {
      return await refreshAccessToken(authStore)
    }
  
    // Decode the access token and check expiration
    try {
      const decodedToken = parseJwt(authStore.accessToken)
      const now = Math.floor(Date.now() / 1000) // Current timestamp in seconds
  
      if (decodedToken.exp < now) {
        console.warn('Access token expired, refreshing...')
        return await refreshAccessToken(authStore)
      }
    } catch (error) {
      console.error('Invalid access token, refreshing...')
      return await refreshAccessToken(authStore)
    }
  })
  
  // Helper function to refresh the access token
  async function refreshAccessToken(authStore:any) {
    try {
      const response: { accessToken: string } = await $fetch(`${$apiBaseUrl()}/auth/refresh`, {
        method: 'POST',
        credentials: 'include' // Sends refresh token from HTTP-only cookie
      })
  
      authStore.setAccessToken(response.accessToken)
    } catch (error) {
      console.error('Session expired, redirecting to login')
      return navigateTo('/')
    }
  }
  
  // Helper function to decode a JWT (Base64 decoding)
  function parseJwt(token: string) {
    const base64Url = token.split('.')[1] // Get payload part
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
  
    return JSON.parse(jsonPayload)
  }