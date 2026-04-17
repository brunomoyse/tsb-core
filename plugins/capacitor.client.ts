// Plugins: capacitor.client.ts — only runs on Capacitor builds
import { defineNuxtPlugin, navigateTo, useNuxtApp, useRuntimeConfig } from '#imports'
import { Capacitor } from '@capacitor/core'

export default defineNuxtPlugin(async () => {
    const config = useRuntimeConfig()
    if (config.public.appBuild !== 'capacitor') return

    const platform = Capacitor.getPlatform() // 'ios' | 'android'

    // Add capacitor-app + platform class to body for safe-area and platform-specific CSS scoping
    document.body.classList.add('capacitor-app', platform)

    // StatusBar styling — platform-specific
    try {
        const { StatusBar, Style } = await import('@capacitor/status-bar')
        if (platform === 'ios') {
            // On iOS the status bar uses native blurred material — only text style is configurable
            await StatusBar.setStyle({ style: Style.Light })
            // Tap status bar to scroll to top (iOS convention)
            StatusBar.addListener('statusTap', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' })
            })
        } else if (platform === 'android') {
            await StatusBar.setStyle({ style: Style.Light })
            await StatusBar.setBackgroundColor({ color: '#FFFFFF' })
            // Prevent status bar from overlaying content (Android 15+ edge-to-edge)
            await StatusBar.setOverlaysWebView({ overlay: false })
        }
    } catch { /* StatusBar not available on web */ }

    // Hide splash screen
    try {
        const { SplashScreen } = await import('@capacitor/splash-screen')
        await SplashScreen.hide()
    } catch { /* SplashScreen not available on web */ }

    // Keyboard handling on iOS: hide tab bar so it doesn't float above the keyboard
    if (platform === 'ios') {
        try {
            const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard')
            // Disable auto-resize so our CSS class has full layout control
            await Keyboard.setResizeMode({ mode: KeyboardResize.None })
            await Keyboard.addListener('keyboardWillShow', () => {
                document.body.classList.add('keyboard-visible')
            })
            // Dismiss keyboard on scroll (matches native iOS behavior).
            // Deferred to keyboardDidShow so animation scroll doesn't immediately hide it.
            await Keyboard.addListener('keyboardDidShow', () => {
                window.addEventListener('scroll', () => Keyboard.hide().catch(() => {}), { passive: true, capture: true, once: true })
            })
            await Keyboard.addListener('keyboardWillHide', () => {
                document.body.classList.remove('keyboard-visible')
            })
        } catch { /* Keyboard plugin not available */ }
    }

    // Android back button handling + OIDC deep link handling
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

        // Rotate refresh token on foreground to reset Zitadel's 30-day idle window.
        App.addListener('appStateChange', async ({ isActive }) => {
            if (!isActive) return
            try {
                const { useOidc } = await import('~/composables/useOidc')
                const { silentRenew } = useOidc()
                await silentRenew()
            } catch { /* Next protected navigation will redirect to login */ }
        })

        // Deep link handler (IdP OAuth callbacks, push notification taps, etc.)
        App.addListener('appUrlOpen', async ({ url }) => {
            if (url.startsWith('be.tokyosushibarliege.app:')) {
                // Strip scheme to get a clean path (e.g. /fr/auth/idp/callback?id=...)
                const path = url.replace(/^be\.tokyosushibarliege\.app:\/\//, '/')

                // Close SFSafariViewController on OAuth callbacks and payment redirects
                if (path.includes('/auth/idp/callback') || path.includes('/order-completed/')) {
                    try {
                        const { Browser } = await import('@capacitor/browser')
                        await Browser.close()
                    } catch { /* Browser not open */ }
                }

                navigateTo(path)
            }
        })
    } catch { /* App plugin not available */ }
})
