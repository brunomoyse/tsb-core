<script lang="ts" setup>
import {onMounted} from '#imports';
import {useAuthStore} from '@/stores/auth'

const authStore = useAuthStore();

onMounted(async () => {
    await authStore.logout()
    window.location.href = '/'
})

</script>
