<template>
    <div
        v-if="visible"
        class="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3 mx-4 mt-4 sm:ml-[142px]"
    >
        <div class="flex items-center gap-3 min-w-0">
            <svg class="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-sm text-amber-800 min-w-0">
                {{ $t('verify.banner') }}
            </p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
            <button
                :disabled="resendLoading"
                class="text-sm font-medium text-amber-700 hover:text-amber-900 underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                @click="resend"
            >
                {{ $t('verify.resend') }}
            </button>
            <button
                class="text-amber-400 hover:text-amber-600 transition-colors"
                :aria-label="$t('verify.dismiss')"
                @click="dismiss"
            >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useGqlMutation } from '@/composables/useGqlMutation'
import { eventBus } from '~/eventBus'
import { useI18n } from 'vue-i18n'

const DISMISS_KEY = 'email_verify_dismiss'
const DISMISS_DURATION = 24 * 60 * 60 * 1000 // 24 hours

const { t } = useI18n()
const authStore = useAuthStore()
const dismissed = ref(false)

// Check if previously dismissed within 24 hours
if (import.meta.client) {
    const dismissedAt = localStorage.getItem(DISMISS_KEY)
    if (dismissedAt && Date.now() - Number(dismissedAt) < DISMISS_DURATION) {
        dismissed.value = true
    }
}

const visible = computed(() => {
    return authStore.user != null
        && authStore.user.emailVerifiedAt == null
        && !dismissed.value
})

const RESEND_MUTATION = `
    mutation {
        resendVerificationEmail
    }
`

const { mutate, loading: resendLoading } = useGqlMutation<{ resendVerificationEmail: boolean }>(RESEND_MUTATION)

const resend = async () => {
    try {
        await mutate()
        eventBus.emit('notify', {
            message: t('verify.sent'),
            variant: 'success',
        })
    } catch {
        eventBus.emit('notify', {
            message: t('verify.error'),
            variant: 'error',
        })
    }
}

const dismiss = () => {
    dismissed.value = true
    if (import.meta.client) {
        localStorage.setItem(DISMISS_KEY, Date.now().toString())
    }
}
</script>
