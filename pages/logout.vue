<script lang="ts" setup>
import {onMounted} from '#imports';
import {useAuthStore} from '@/stores/auth'
import {useTracking} from '~/composables/useTracking'

const authStore = useAuthStore();
const { trackEvent, resetUser } = useTracking()

onMounted(async () => {
    trackEvent('user_logged_out')
    resetUser()
    await authStore.logout()
    window.location.href = '/'
})

</script>
