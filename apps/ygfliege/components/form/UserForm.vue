<template>
    <form class="space-y-4" :class="{ 'animate-shake': isShaking }" @submit.prevent="handleSubmit">
        <div>
            <label class="field-label" for="firstName">
                {{ $t('form.firstName') }}
            </label>
            <input id="firstName" v-model="firstName"
                   :placeholder="$t('form.firstNamePlaceholder')"
                   autocomplete="given-name"
                   class="field"
                   required type="text"/>
        </div>

        <div>
            <label class="field-label" for="lastName">
                {{ $t('form.lastName') }}
            </label>
            <input id="lastName" v-model="lastName"
                   :placeholder="$t('form.lastNamePlaceholder')"
                   autocomplete="name"
                   class="field"
                   required type="text"/>
        </div>

        <div>
            <label class="field-label" for="email">
                {{ $t('form.email') }}
            </label>
            <input id="email" v-model="email"
                   :placeholder="$t('form.emailPlaceholder')"
                   autocomplete="email"
                   class="field"
                   required type="email"/>
        </div>

        <div>
            <label class="field-label" for="phone">
                {{ $t('form.phone') }}
            </label>
            <div class="flex gap-2">
                <select id="country" v-model="selectedCountry"
                        class="field">
                    <option v-for="country in countries" :key="country.code" :value="country.code">
                        {{ country.flag }} {{ getCountryName(country.code, locale) }} ({{ country.prefix }})
                    </option>
                </select>
                <input id="phone" v-model="phoneLocal"
                       :placeholder="$t('form.phonePlaceholder')"
                       class="field flex-1"
                       type="tel"/>
            </div>
            <p v-if="phoneError" class="text-sm text-ygf-error mt-1">{{ phoneError }}</p>
        </div>

        <AddressAutocomplete v-show="!address" @update:address="(updatedAddress) => address = updatedAddress" />

        <div v-if="address" class="mt-2">
            <div class="card p-3">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <strong class="text-sm text-ygf-black">{{ $t('form.address.label') }}</strong>
                        <p class="text-sm text-ygf-gray-600 mt-1 whitespace-pre-line">{{ formatAddress(address) }}</p>
                    </div>
                    <button
                        type="button"
                        @click="removeAddress"
                        class="ml-3 text-sm font-medium hover:opacity-70 transition-opacity duration-300"
                        style="color: var(--ygf-orange-on-white)"
                    >
                        {{ $t('common.remove') }}
                    </button>
                </div>
            </div>
        </div>

        <div class="flex gap-2">
            <button type="button" @click="emit('close')"
                    class="btn btn-secondary w-1/2">
                {{ $t('common.cancel') }}
            </button>
            <button type="submit"
                    class="btn btn-primary w-1/2">
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
    border: 1px solid rgba(242, 123, 32, 0.12);
    border-radius: var(--radius-card);
    background: var(--ygf-white);
}
li {
    padding: 0.5rem;
    cursor: pointer;
    transition: background-color 0.2s;
}
li:hover {
    background-color: rgba(242, 123, 32, 0.06);
}
input, select, textarea {
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: var(--ygf-orange-on-white);
    box-shadow: 0 0 0 3px rgba(242, 123, 32, 0.12);
}
</style>
