<template>
    <form class="space-y-4" :class="{ 'animate-shake': isShaking }" @submit.prevent="handleSubmit">
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5" for="firstName">
                {{ $t('form.firstName') }}
            </label>
            <input id="firstName" v-model="firstName"
                   :placeholder="$t('form.firstNamePlaceholder')"
                   autocomplete="given-name"
                   class="w-full px-3.5 py-2.5 bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl text-gray-900 placeholder-gray-400 focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:border-red-300 focus-visible:outline-none transition-all duration-300"
                   required type="text"/>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5" for="lastName">
                {{ $t('form.lastName') }}
            </label>
            <input id="lastName" v-model="lastName"
                   :placeholder="$t('form.lastNamePlaceholder')"
                   autocomplete="name"
                   class="w-full px-3.5 py-2.5 bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl text-gray-900 placeholder-gray-400 focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:border-red-300 focus-visible:outline-none transition-all duration-300"
                   required type="text"/>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5" for="email">
                {{ $t('form.email') }}
            </label>
            <input id="email" v-model="email"
                   :placeholder="$t('form.emailPlaceholder')"
                   autocomplete="email"
                   class="w-full px-3.5 py-2.5 bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl text-gray-900 placeholder-gray-400 focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:border-red-300 focus-visible:outline-none transition-all duration-300"
                   required type="email"/>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5" for="phone">
                {{ $t('form.phone') }}
            </label>
            <div class="flex space-x-2">
                <select id="country" v-model="selectedCountry"
                        class="px-2.5 py-2.5 bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl text-gray-900 focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:border-red-300 focus-visible:outline-none transition-all duration-300">
                    <option v-for="country in countries" :key="country.code" :value="country.code">
                        {{ country.flag }} {{ getCountryName(country.code, locale) }} ({{ country.prefix }})
                    </option>
                </select>
                <input id="phone" v-model="phoneLocal"
                       :placeholder="$t('form.phonePlaceholder')"
                       class="flex-1 px-3.5 py-2.5 bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl text-gray-900 placeholder-gray-400 focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:border-red-300 focus-visible:outline-none transition-all duration-300"
                       type="tel"/>
            </div>
            <p v-if="phoneError" class="text-sm text-red-500 mt-1">{{ phoneError }}</p>
        </div>

        <AddressAutocomplete v-show="!address" @update:address="(updatedAddress) => address = updatedAddress" />

        <div v-if="address" class="mt-2">
            <div class="p-3 border border-gray-200/80 rounded-xl bg-white/40 backdrop-blur-sm">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <strong class="text-sm text-gray-700">{{ $t('form.address.label') }}</strong>
                        <p class="text-sm text-gray-600 mt-1 whitespace-pre-line">{{ formatAddress(address) }}</p>
                    </div>
                    <button
                        type="button"
                        @click="removeAddress"
                        class="ml-3 text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                        {{ $t('common.remove') }}
                    </button>
                </div>
            </div>
        </div>

        <div class="flex gap-2">
            <button type="button" @click="emit('close')"
                    class="w-1/2 bg-white/60 backdrop-blur-sm text-gray-700 py-2.5 rounded-xl border border-gray-200/80 hover:bg-white transition-all duration-300 text-sm active:scale-[0.97]">
                {{ $t('common.cancel') }}
            </button>
            <button type="submit"
                    class="w-1/2 bg-red-500 text-white py-2.5 rounded-xl font-medium hover:bg-red-600 transition-all duration-300 text-sm active:scale-[0.97] shadow-sm hover:shadow-md">
                {{ $t('me.profile.update') }}
            </button>
        </div>
    </form>
</template>

<script lang="ts" setup>
import type { Address, UpdateUserRequest } from '#engine/types'
import { EUROPEAN_COUNTRIES, getCountryName } from '#engine/utils/europeanCountries'
import { ref, watch } from 'vue'
import AddressAutocomplete from '~/components/form/AddressAutocomplete.vue'
import type { CountryCode } from 'libphonenumber-js'
import { formatAddress } from '#engine/utils/utils'
import { useI18n } from 'vue-i18n'

interface InitialValues {
    firstName?: string
    lastName?: string
    email?: string
    phoneLocal?: string
    selectedCountry?: string
    address?: Address | null
}

const { initialValues = {} as InitialValues } = defineProps<{
    initialValues?: InitialValues
}>()

const emit = defineEmits<{
    submit: [form: UpdateUserRequest]
    close: []
}>()

const { t, locale } = useI18n()

const firstName = ref(initialValues.firstName || '')
const lastName = ref(initialValues.lastName || '')
const email = ref(initialValues.email || '')
const phoneLocal = ref(initialValues.phoneLocal || '')
const selectedCountry = ref(initialValues.selectedCountry || 'BE')

const address = ref<Address | null>(initialValues.address || null)

const phoneError = ref('')

const isShaking = ref(false)
const triggerShake = () => {
    isShaking.value = true
    setTimeout(() => { isShaking.value = false }, 400)
}

const countries = EUROPEAN_COUNTRIES

watch(address, () => {
    // No-op: address state is committed immediately on selection in edit mode.
})

const removeAddress = () => {
    address.value = null
}

// Lazy-load libphonenumber-js (~75KB) only when the user actually submits/validates a phone number.
// Returns the E.164 string on success, or null on failure (and sets phoneError).
const validatePhone = async (): Promise<string | null> => {
    const { parsePhoneNumberFromString } = await import('libphonenumber-js')
    const parsed = parsePhoneNumberFromString(phoneLocal.value, selectedCountry.value as CountryCode)
    if (!parsed?.isValid()) {
        phoneError.value = t('form.invalidPhone')
        return null
    }
    phoneError.value = ''
    return parsed.format('E.164')
}

const handleSubmit = async () => {
    const hasCurrentPhone = phoneLocal.value && phoneLocal.value.trim() !== ''
    let phoneE164: string | null = null
    if (hasCurrentPhone) {
        phoneE164 = await validatePhone()
        if (!phoneE164) { triggerShake(); return }
    }
    if (!firstName.value || !lastName.value || !email.value) { triggerShake(); return }

    // Send empty string to trigger deletion when a previously-set field is cleared.
    const hasInitialAddress = initialValues.address !== null && initialValues.address !== undefined
    const hasCurrentAddress = address.value !== null

    const hasInitialPhone = initialValues.phoneLocal && initialValues.phoneLocal.trim() !== ''

    let phoneValue: string | null = null
    if (hasCurrentPhone) {
        phoneValue = phoneE164
    } else if (hasInitialPhone) {
        phoneValue = ''
    }

    const form: UpdateUserRequest = {
        firstName: firstName.value,
        lastName: lastName.value,
        phoneNumber: phoneValue,
        addressPlaceId: hasCurrentAddress ? address.value?.id || null : (hasInitialAddress ? '' : null),
    }

    emit('submit', form)
}
</script>

<style scoped>
ul {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 150px;
    overflow-y: auto;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    background: white;
}
li {
    padding: 0.5rem;
    cursor: pointer;
    transition: background-color 0.2s;
}
li:hover {
    background-color: #f3f4f6;
}
input, select, textarea {
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: #fca5a5;
    box-shadow: 0 0 0 3px rgba(252, 165, 165, 0.25);
}
</style>
