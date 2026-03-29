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

        // Deep link handler (for future use: push notification taps, etc.)
        App.addListener('appUrlOpen', ({ url }) => {
            // Custom scheme deep links (e.g., be.tokyosushibarliege.app:/...)
            if (url.startsWith('be.tokyosushibarliege.app:')) {
                const path = url.replace('be.tokyosushibarliege.app:', '')
                navigateTo(path)
            }
        })
    } catch { /* App plugin not available */ }
})
