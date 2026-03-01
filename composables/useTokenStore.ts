import type { PreferencesPlugin } from '@capacitor/preferences'
import { useRuntimeConfig } from '#imports'

interface TokenStore {
    getAccessToken(): Promise<string | null>
    getRefreshToken(): Promise<string | null>
    setTokens(accessToken: string, refreshToken: string): Promise<void>
    clearTokens(): Promise<void>
}

let preferencesModule: { Preferences: PreferencesPlugin } | null = null

async function getPreferences() {
    if (!preferencesModule) {
        preferencesModule = await import('@capacitor/preferences')
    }
    return preferencesModule.Preferences
}

/** Capacitor token store — persists in native Preferences (SharedPreferences / NSUserDefaults) */
const capacitorStore: TokenStore = {
    async getAccessToken() {
        const { value } = await (await getPreferences()).get({ key: 'access_token' })
        return value
    },
    async getRefreshToken() {
        const { value } = await (await getPreferences()).get({ key: 'refresh_token' })
        return value
    },
    async setTokens(accessToken: string, refreshToken: string) {
        const prefs = await getPreferences()
        await prefs.set({ key: 'access_token', value: accessToken })
        await prefs.set({ key: 'refresh_token', value: refreshToken })
    },
    async clearTokens() {
        const prefs = await getPreferences()
        await prefs.remove({ key: 'access_token' })
        await prefs.remove({ key: 'refresh_token' })
    },
}

/** Web no-op store — cookies are handled by the browser automatically */
const webStore: TokenStore = {
    getAccessToken() { return Promise.resolve(null) },
    getRefreshToken() { return Promise.resolve(null) },
    setTokens() { return Promise.resolve() },
    clearTokens() { return Promise.resolve() },
}

export function useTokenStore(): TokenStore {
    const config = useRuntimeConfig()
    return config.public.appBuild === 'capacitor' ? capacitorStore : webStore
}
