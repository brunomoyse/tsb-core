<template>
    <section
        id="checkout-phone-capture"
        tabindex="-1"
        class="rounded-lg border p-4 shadow-sm"
        :class="isCollapsed
            ? 'bg-ygf-white border-subtle'
            : 'bg-amber-50/70 border-amber-200'"
    >
        <div class="flex items-start gap-3">
            <svg class="w-5 h-5 mt-0.5 shrink-0" :class="isCollapsed ? 'text-ygf-gray-400' : 'text-amber-600'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path v-if="isCollapsed" stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.95.68l1.5 4.5a1 1 0 01-.5 1.21l-2.26 1.13a11 11 0 005.5 5.5l1.13-2.26a1 1 0 011.21-.5l4.5 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z" />
            </svg>
            <div class="flex-1 min-w-0">
                <h3 class="text-sm font-semibold" :class="isCollapsed ? 'text-ygf-black' : 'text-amber-800'">
                    {{ $t('checkout.phoneCapture.title') }}
                </h3>
                <p v-if="isCollapsed" class="text-xs mt-0.5 text-ygf-gray-400 tabular-nums">
                    {{ authStore.user?.phoneNumber }}
                </p>
                <p v-else class="text-xs mt-0.5 text-amber-700/80">
                    {{ $t('checkout.phoneCapture.description') }}
                </p>
            </div>
            <button
                v-if="isCollapsed"
                type="button"
                :aria-label="$t('checkout.editAddress')"
                class="min-h-11 min-w-11 inline-flex items-center justify-center px-3 -mr-2 text-sm font-medium text-ygf-orange-600 hover:text-ygf-orange-700 rounded-md focus-visible:ring-2 focus-visible:ring-ygf-orange-300 focus:outline-none transition-colors"
                @click="startEditing"
            >
                {{ $t('checkout.phoneCapture.edit') }}
            </button>
        </div>

        <div v-if="!isCollapsed" class="mt-3">
            <div class="relative">
                <input
                    ref="phoneInputRef"
                    v-model="phoneLocal"
                    type="tel"
                    autocomplete="tel"
                    inputmode="tel"
                    :placeholder="$t('form.phonePlaceholder')"
                    :aria-label="$t('form.phone')"
                    class="w-full px-3 py-2.5 pr-9 bg-ygf-white border border-subtle rounded-xl text-sm text-ygf-black placeholder-ygf-gray-400 tabular-nums focus-visible:ring-2 focus-visible:ring-ygf-orange-300/50 focus-visible:border-ygf-orange focus-visible:outline-none transition-all duration-normal"
                />
                <span v-if="loading" class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-ygf-gray-200 border-t-ygf-orange-on-white rounded-full animate-spin" />
            </div>
        </div>

        <p v-if="phoneError" class="text-xs text-red-600 mt-2">{{ phoneError }}</p>
    </section>
</template>

<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useAuthStore, useGqlMutation } from '#imports'
import type { User } from '#engine/types'
import gql from 'graphql-tag'
import { useI18n } from 'vue-i18n'
import { useNotificationsStore } from '#engine/stores/notifications'

const { t } = useI18n()
const authStore = useAuthStore()
const notifications = useNotificationsStore()

const phoneLocal = ref('')
const phoneError = ref('')
const loading = ref(false)
const isEditing = ref(false)
const phoneInputRef = ref<HTMLInputElement | null>(null)

const saved = computed(() => Boolean(authStore.user?.phoneNumber))
// Collapsed: we have a saved number and the user isn't actively editing.
const isCollapsed = computed(() => saved.value && !isEditing.value)

// Lazy-load libphonenumber-js (~75KB) only when the user actually edits or submits a phone number.
const startEditing = async () => {
    const current = authStore.user?.phoneNumber ?? ''
    if (current) {
        const { parsePhoneNumberFromString } = await import('libphonenumber-js')
        const parsed = parsePhoneNumberFromString(current)
        if (parsed?.country === 'BE') {
            phoneLocal.value = parsed.formatNational()
        } else if (parsed) {
            phoneLocal.value = parsed.formatInternational()
        } else {
            phoneLocal.value = current
        }
    } else {
        phoneLocal.value = ''
    }
    lastSubmittedE164 = current
    isEditing.value = true
    await nextTick()
    phoneInputRef.value?.focus()
}

const UPDATE_ME = gql`
    mutation ($input: UpdateUserInput!) {
        updateMe(input: $input) {
            id
            phoneNumber
        }
    }
`
const { mutate: mutationUpdateMe } = useGqlMutation<{ updateMe: Pick<User, 'id' | 'phoneNumber'> }>(UPDATE_ME)

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let lastSubmittedE164 = ''

const save = async (e164: string) => {
    if (e164 === lastSubmittedE164) return
    lastSubmittedE164 = e164
    loading.value = true
    try {
        const res = await mutationUpdateMe({ input: { phoneNumber: e164 } })
        authStore.updateUser({ phoneNumber: res.updateMe.phoneNumber })
        isEditing.value = false
        notifications.notify({
            message: t('checkout.phoneCapture.saved'),
            persistent: false,
            duration: 3000,
            variant: 'success',
        })
    } catch (err) {
        if (import.meta.dev) console.error('Failed to save phone:', err)
        phoneError.value = t('notify.errors.profileUpdateFailed')
        lastSubmittedE164 = ''
    } finally {
        loading.value = false
    }
}

watch(phoneLocal, (value) => {
    phoneError.value = ''
    if (debounceTimer) clearTimeout(debounceTimer)
    const trimmed = value.trim()
    if (!trimmed) return
    debounceTimer = setTimeout(async () => {
        const { parsePhoneNumberFromString } = await import('libphonenumber-js')
        // Default to BE so a leading "0" parses as a Belgian national number; a leading "+" overrides the default and parses as international.
        const parsed = parsePhoneNumberFromString(trimmed, 'BE')
        if (parsed?.isValid()) {
            save(parsed.format('E.164'))
        } else if (trimmed.startsWith('+')) {
            phoneError.value = t('form.invalidPhone')
        } else {
            phoneError.value = t('checkout.phoneCapture.addCountryPrefix')
        }
    }, 500)
})
</script>
