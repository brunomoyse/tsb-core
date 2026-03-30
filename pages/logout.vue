<script lang="ts" setup>
import { definePageMeta, onMounted } from '#imports'
import { useAuthStore } from '@/stores/auth'
import { usePushNotifications } from '~/composables/usePushNotifications'
import { useTracking } from '~/composables/useTracking'

definePageMeta({ public: true })

const authStore = useAuthStore()
const { unregister: unregisterPush } = usePushNotifications()
const { trackEvent, resetUser } = useTracking()

onMounted(async () => {
    trackEvent('user_logged_out')
    resetUser()
    // Unregister push notification token before clearing auth
    await unregisterPush()
    // Clear local state FIRST (before redirect to Zitadel end-session)
    authStore.clearUser()
    // Then trigger OIDC signOut (redirects to Zitadel → /auth/logout → home)
    await authStore.logout()
})
</script>
