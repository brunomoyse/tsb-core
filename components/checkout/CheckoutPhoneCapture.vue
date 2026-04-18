<template>
    <section
        class="rounded-lg border p-4 shadow-sm"
        :class="saved
            ? 'bg-emerald-50/70 border-emerald-200'
            : 'bg-amber-50/70 border-amber-200'"
    >
        <div class="flex items-start gap-3">
            <svg class="w-5 h-5 mt-0.5 shrink-0" :class="saved ? 'text-emerald-600' : 'text-amber-600'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path v-if="saved" stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                <path v-else stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.95.68l1.5 4.5a1 1 0 01-.5 1.21l-2.26 1.13a11 11 0 005.5 5.5l1.13-2.26a1 1 0 011.21-.5l4.5 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z" />
            </svg>
            <div class="flex-1 min-w-0">
                <h3 class="text-sm font-semibold" :class="saved ? 'text-emerald-800' : 'text-amber-800'">
                    {{ $t('checkout.phoneCapture.title') }}
                </h3>
                <p class="text-xs mt-0.5" :class="saved ? 'text-emerald-700/80' : 'text-amber-700/80'">
                    {{ saved ? $t('checkout.phoneCapture.saved') : $t('checkout.phoneCapture.description') }}
                </p>
            </div>
        </div>

        <form v-if="!saved" class="mt-3 flex flex-col sm:flex-row gap-2" @submit.prevent="submit">
            <div class="flex gap-2 flex-1">
                <select
                    v-model="selectedCountry"
                    :aria-label="$t('register.phone')"
                    class="px-2.5 py-2.5 bg-white border border-gray-200 rounded-md text-sm text-gray-900 focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:border-red-300 focus-visible:outline-none transition-all duration-300"
                >
                    <option v-for="country in countries" :key="country.code" :value="country.code">
                        {{ country.flag }} {{ country.prefix }}
                    </option>
                </select>
                <input
                    v-model="phoneLocal"
                    type="tel"
                    autocomplete="tel-national"
                    :placeholder="$t('register.phonePlaceholder')"
                    class="flex-1 min-w-0 px-3 py-2.5 bg-white border border-gray-200 rounded-md text-sm text-gray-900 placeholder-gray-400 focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:border-red-300 focus-visible:outline-none transition-all duration-300"
                />
            </div>
            <button
                type="submit"
                :disabled="loading"
                class="px-4 py-2.5 rounded-md bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-all duration-300 active:scale-[0.97] shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {{ loading ? $t('checkout.processing') : $t('common.save') }}
            </button>
        </form>

        <p v-if="phoneError" class="text-xs text-red-600 mt-2">{{ phoneError }}</p>
    </section>
</template>

<script lang="ts" setup>
import { type CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js'
import { computed, ref } from 'vue'
import { useAuthStore, useGqlMutation } from '#imports'
import type { User } from '~/types'
import { eventBus } from '~/eventBus'
import gql from 'graphql-tag'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const authStore = useAuthStore()

const countries = [
    { prefix: '+31', code: 'NL', flag: '\u{1F1F3}\u{1F1F1}' },
    { prefix: '+32', code: 'BE', flag: '\u{1F1E7}\u{1F1EA}' },
    { prefix: '+33', code: 'FR', flag: '\u{1F1EB}\u{1F1F7}' },
    { prefix: '+352', code: 'LU', flag: '\u{1F1F1}\u{1F1FA}' },
    { prefix: '+44', code: 'DE', flag: '\u{1F1E9}\u{1F1EA}' },
]

const phoneLocal = ref('')
const selectedCountry = ref<CountryCode>('BE')
const phoneError = ref('')
const loading = ref(false)

const saved = computed(() => Boolean(authStore.user?.phoneNumber))

const UPDATE_ME = gql`
    mutation ($input: UpdateUserInput!) {
        updateMe(input: $input) {
            id
            phoneNumber
        }
    }
`
const { mutate: mutationUpdateMe } = useGqlMutation<{ updateMe: Pick<User, 'id' | 'phoneNumber'> }>(UPDATE_ME)

const submit = async () => {
    phoneError.value = ''
    const parsed = parsePhoneNumberFromString(phoneLocal.value, selectedCountry.value)
    if (!parsed?.isValid()) {
        phoneError.value = t('register.invalidPhone')
        return
    }

    loading.value = true
    try {
        const res = await mutationUpdateMe({ input: { phoneNumber: parsed.format('E.164') } })
        authStore.updateUser({ phoneNumber: res.updateMe.phoneNumber })
        eventBus.emit('notify', {
            message: t('checkout.phoneCapture.saved'),
            persistent: false,
            duration: 3000,
            variant: 'success',
        })
    } catch (err) {
        if (import.meta.dev) console.error('Failed to save phone:', err)
        phoneError.value = t('notify.errors.profileUpdateFailed')
    } finally {
        loading.value = false
    }
}
</script>
