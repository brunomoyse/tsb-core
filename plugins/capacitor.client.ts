// Plugins: capacitor.client.ts — only runs on Capacitor builds
import { defineNuxtPlugin, navigateTo, useLocalePath, useNuxtApp, useRuntimeConfig } from '#imports'
import { useAuthStore } from '@/stores/auth'
import { useTokenStore } from '~/composables/useTokenStore'

export default defineNuxtPlugin(async () => {
    const config = useRuntimeConfig()
    if (config.public.appBuild !== 'capacitor') return

    const localePath = useLocalePath()

    // Add capacitor-app class to body for safe-area CSS scoping
    document.body.classList.add('capacitor-app')

    // StatusBar styling
    try {
        const { StatusBar, Style } = await import('@capacitor/status-bar')
        await StatusBar.setStyle({ style: Style.Light })
        await StatusBar.setBackgroundColor({ color: '#FFFFFF' })
    } catch { /* StatusBar not available on web */ }

    // Hide splash screen
    try {
        const { SplashScreen } = await import('@capacitor/splash-screen')
        await SplashScreen.hide()
    } catch { /* SplashScreen not available on web */ }

    // Android back button handling
    try {
        const { App } = await import('@capacitor/app')
        const router = useNuxtApp().$router

        App.addListener('backButton', ({ canGoBack }) => {
            if (canGoBack) {
                router.back()
            } else {
                App.exitApp()
            }
        })

        // OAuth deep link handling: tokyosushi://oauth/callback?accessToken=...&refreshToken=...
        App.addListener('appUrlOpen', async ({ url }) => {
            if (!url.startsWith('tokyosushi://oauth/callback')) return

            const params = new URL(url).searchParams
            const accessToken = params.get('accessToken')
            const refreshToken = params.get('refreshToken')

            if (accessToken && refreshToken) {
                const tokenStore = useTokenStore()
                const authStore = useAuthStore()

                await tokenStore.setTokens(accessToken, refreshToken)
                authStore.setAccessValid(true)

                // Close the in-app browser if still open
                try {
                    const { Browser } = await import('@capacitor/browser')
                    await Browser.close()
                } catch { /* Ignore browser close error */ }

                navigateTo(localePath('menu'))
            }
        })
    } catch { /* App plugin not available */ }
})
