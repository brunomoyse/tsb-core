<script lang="ts" setup>
import { definePageMeta, navigateTo, onMounted, useLocalePath } from '#imports'
import { useAuthStore } from '@/stores/auth'
import { useTracking } from '~/composables/useTracking'

definePageMeta({ public: true })

const authStore = useAuthStore()
const localePath = useLocalePath()
const { trackEvent, resetUser } = useTracking()

onMounted(() => {
    // Clear local state (Zitadel session already ended if we arrived here via OIDC end-session)
    trackEvent('user_logged_out')
    resetUser()
    authStore.clearUser()
    navigateTo(localePath('/'))
})
</script>
