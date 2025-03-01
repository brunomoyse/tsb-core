// plugins/fetchAuth.ts
import { defineNuxtPlugin, useNuxtApp } from '#app'
import { useAuthStore } from '@/stores/auth'

export default defineNuxtPlugin((nuxtApp) => {
  const authStore = useAuthStore()
  const { $apiBaseUrl } = useNuxtApp()

  const originalFetch = globalThis.$fetch
  let refreshPromise: Promise<string | null> | null = null

  async function refreshAccessToken(): Promise<string | null> {
    try {
      // Use originalFetch to avoid interceptor loop
      const response: any = await originalFetch(`${$apiBaseUrl()}/tokens:refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      return data.accessToken
    } catch (error) {
      console.error('Failed to refresh access token:', error)
      return null
    }
  }

  async function attemptRefresh(): Promise<string | null> {
    // Prevent concurrent refresh attempts
    if (refreshPromise) return refreshPromise

    refreshPromise = (async () => {
      try {
        const newToken = await refreshAccessToken()
        if (newToken) authStore.setAccessToken(newToken)
        return newToken
      } finally {
        refreshPromise = null
      }
    })()

    return refreshPromise
  }

  const newFetch = async (input: string | URL, init: RequestInit = {}): Promise<any> => {
    const url = typeof input === 'string' ? input : input.toString()
    const headers = { ...init.headers }

    // Initial token attachment
    if (authStore.accessToken) {
      headers['Authorization'] = `Bearer ${authStore.accessToken}`
    } else {
      const newToken = await attemptRefresh()
      if (newToken) headers['Authorization'] = `Bearer ${newToken}`
    }

    try {
      return await originalFetch(url, { ...init, headers })
    } catch (error: any) {
      if (error.status === 401) {
        console.warn('Access token expired; attempting to refresh...')
        const newToken = await attemptRefresh()

        if (newToken) {
          // Retry with new token using original fetch
          return originalFetch(url, {
            ...init,
            headers: { ...headers, Authorization: `Bearer ${newToken}` }
          })
        } else {
          // Remove invalid token and retry
          const { Authorization, ...cleanHeaders } = headers
          return originalFetch(url, { ...init, headers: cleanHeaders })
        }
      }
      throw error
    }
  }

  globalThis.$fetch = newFetch
})