<template>
    <form class="space-y-4" @submit.prevent="onSubmit">
        <div>
            <h2 class="text-lg font-semibold text-ygf-black">
                {{ $t('login.profileTitle') }}
            </h2>
            <p class="text-sm text-ygf-gray-600 mt-1">
                {{ $t('login.profileSubtitle') }}
            </p>
        </div>

        <div>
            <label class="field-label" for="auth-firstname">
                {{ $t('form.firstName') }}
            </label>
            <input
                id="auth-firstname"
                ref="firstNameInputRef"
                v-model="firstName"
                :placeholder="$t('form.firstNamePlaceholder')"
                autocomplete="given-name"
                class="field"
                maxlength="60"
                name="firstName"
                required
                type="text"
            >
        </div>

        <div>
            <label class="field-label" for="auth-lastname">
                {{ $t('form.lastName') }}
            </label>
            <input
                id="auth-lastname"
                v-model="lastName"
                :placeholder="$t('form.lastNamePlaceholder')"
                autocomplete="family-name"
                class="field"
                maxlength="60"
                name="lastName"
                required
                type="text"
            >
        </div>

        <div
            v-if="errorMessage"
            aria-atomic="true"
            aria-live="assertive"
            class="text-sm text-ygf-error bg-red-50 border border-red-200 rounded-ygf-card px-3.5 py-2.5 animate-shake"
            role="alert"
        >
            {{ errorMessage }}
        </div>

        <button
            :disabled="loading || !firstName.trim() || !lastName.trim()"
            class="btn btn-primary w-full"
            type="submit"
        >
            {{ $t('login.completeSignup') }}
        </button>
    </form>
</template>

<script lang="ts" setup>
import { nextTick, onMounted, ref } from 'vue'

/*
 * Captures first/last name for brand-new accounts. Shared by both signup paths
 * so the screen is identical:
 *  - OTP (identifier-first): placeholder account created on first email login.
 *  - Social IdP (Apple/Google): the provider returned no name (e.g. Apple only
 *    sends it on the first-ever authorization), so the backend stored a "-"
 *    placeholder. See components/auth/AuthFlow.vue and pages/auth/idp/callback.vue.
 */
defineProps<{
    loading?: boolean
    errorMessage?: string
}>()

const emit = defineEmits<{
    submit: [payload: { firstName: string; lastName: string }]
}>()

const firstName = ref('')
const lastName = ref('')
const firstNameInputRef = ref<HTMLInputElement | null>(null)

onMounted(async () => {
    await nextTick()
    firstNameInputRef.value?.focus()
})

const onSubmit = () => {
    if (!firstName.value.trim() || !lastName.value.trim()) return
    emit('submit', { firstName: firstName.value.trim(), lastName: lastName.value.trim() })
}
</script>
