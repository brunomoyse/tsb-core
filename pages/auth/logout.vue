<script lang="ts" setup>
import { definePageMeta, navigateTo, onMounted, useLocalePath, useRoute, useRuntimeConfig } from '#imports'
import { useAuthStore } from '@/stores/auth'
import { useTracking } from '~/composables/useTracking'

definePageMeta({ public: true })

const authStore = useAuthStore()
const localePath = useLocalePath()
const config = useRuntimeConfig()
const route = useRoute()
const { trackEvent, resetUser } = useTracking()

onMounted(async () => {
    trackEvent('user_logged_out')
    resetUser()
    authStore.clearUser()

    const { useOidc } = await import('~/composables/useOidc')

    if (config.public.appBuild === 'capacitor') {
        // Capacitor: clear local tokens without browser redirect
        const { logoutCapacitor } = useOidc()
        logoutCapacitor()
        navigateTo(localePath('/'))
        return
    }

    // Front-channel logout: Zitadel already ended the session and notified us via
    // A logout_token query param. Just clear local state and redirect — do NOT
    // Call signOut() or we loop back into Zitadel's end-session endpoint.
    if (route.query.logout_token) {
        const { removeUser } = useOidc()
        try { await removeUser() } catch { /* Best-effort cleanup */ }
        const redirectTarget = typeof route.query.post_logout_redirect === 'string'
            ? route.query.post_logout_redirect
            : localePath('/')
        window.location.replace(redirectTarget)
        return
    }

    // User-initiated logout: end OIDC session at Zitadel (triggers redirect to post_logout_redirect_uri)
    const { signOut } = useOidc()
    try {
        await signOut()
    } catch {
        // If Zitadel unreachable, navigate home anyway
        navigateTo(localePath('/'))
    }
})
</script>
