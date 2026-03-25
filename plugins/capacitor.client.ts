// Plugins: capacitor.client.ts — only runs on Capacitor builds
import { defineNuxtPlugin, navigateTo, useNuxtApp, useRuntimeConfig } from '#imports'

export default defineNuxtPlugin(async () => {
    const config = useRuntimeConfig()
    if (config.public.appBuild !== 'capacitor') return

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

        // OIDC deep link handling: tokyosushi://auth/callback?code=...&state=...
        App.addListener('appUrlOpen', async ({ url }) => {
            if (!url.startsWith('tokyosushi://auth/callback')) return

            // Close the in-app browser if still open
            try {
                const { Browser } = await import('@capacitor/browser')
                await Browser.close()
            } catch { /* Ignore browser close error */ }

            // The OIDC callback will be handled by oidc-client-ts
            // Navigate to the callback route which exchanges the code for tokens
            const callbackUrl = url.replace('tokyosushi://', '/')
            navigateTo(callbackUrl)
        })
    } catch { /* App plugin not available */ }
})
