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

    // Capacitor: clear local tokens without browser redirect
    if (config.public.appBuild === 'capacitor') {
        const { useOidc } = await import('~/composables/useOidc')
        const { logoutCapacitor } = useOidc()
        await logoutCapacitor()
    }

    navigateTo(localePath('/'))
})
</script>
