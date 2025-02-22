<template>
    <button :class="`relative flex items-center justify-center rounded-full h-9 p-4
        font-semibold text-sm ${!isUserConnected
            ? 'bg-off-white text-tsb-gray hover:bg-tsb-pink hover:text-black'
            : 'bg-tsb-red-darker hover:bg-tsb-red'}`">

        <!-- User SVG Icon -->
        <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" class="h-5 w-5 fill-current">
            <path fillRule="evenodd" clipRule="evenodd"
                d="M8 9a3 3 0 100-6 3 3 0 000 6zm0 1c-2.21 0-6 1.12-6 3.5V15h12v-1.5c0-2.38-3.79-3.5-6-3.5z">
            </path>
        </svg>

        <span class="desktop-only">{{ isUserConnected ? $t('nav.myAccount') : $t('nav.login') }}</span>
    </button>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const isUserConnected = authStore.user !== null
</script>