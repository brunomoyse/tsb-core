<template>
    <form class="space-y-4" @submit.prevent="onSubmit">
        <div>
            <h2 class="text-lg font-semibold text-gray-900">
                {{ $t('login.profileTitle') }}
            </h2>
            <p class="text-sm text-gray-600 mt-1">
                {{ $t('login.profileSubtitle') }}
            </p>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5" for="auth-firstname">
                {{ $t('form.firstName') }}
            </label>
            <input
                id="auth-firstname"
                ref="firstNameInputRef"
                v-model="firstName"
                :placeholder="$t('form.firstNamePlaceholder')"
                autocomplete="given-name"
                class="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:border-red-300 focus-visible:outline-none transition-all duration-300"
                maxlength="60"
                name="firstName"
                required
                type="text"
            >
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5" for="auth-lastname">
                {{ $t('form.lastName') }}
            </label>
            <input
                id="auth-lastname"
                v-model="lastName"
                :placeholder="$t('form.lastNamePlaceholder')"
                autocomplete="family-name"
                class="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:border-red-300 focus-visible:outline-none transition-all duration-300"
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
            class="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 animate-shake"
            role="alert"
        >
            {{ errorMessage }}
        </div>

        <button
            :disabled="loading || !firstName.trim() || !lastName.trim()"
            class="w-full bg-red-500 text-white py-2.5 rounded-xl font-medium hover:bg-red-600 transition-all duration-300 active:scale-[0.97] shadow-sm hover:shadow-md disabled:opacity-50"
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
