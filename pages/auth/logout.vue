<script lang="ts" setup>
import { definePageMeta, navigateTo, onMounted, useLocalePath, useRuntimeConfig } from '#imports'
import { useAuthStore } from '@/stores/auth'
import { useTracking } from '~/composables/useTracking'

definePageMeta({ public: true })

const authStore = useAuthStore()
const localePath = useLocalePath()
const config = useRuntimeConfig()
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
    } else {
        // Web: end OIDC session at Zitadel (triggers redirect to post_logout_redirect_uri)
        const { signOut } = useOidc()
        try {
            await signOut()
        } catch {
            // If Zitadel unreachable, navigate home anyway
            navigateTo(localePath('/'))
        }
    }
})
</script>
