<template>
    <form class="space-y-4" @submit.prevent="handleSubmit">
        <!-- Personal Information Fields -->
        <div>
            <label class="block text-sm text-gray-700 mb-1" for="firstName">
                {{ $t('register.firstName') }}
            </label>
            <input id="firstName" v-model="firstName"
                   :placeholder="$t('register.firstNamePlaceholder')"
                   autocomplete="given-name"
                   class="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                   required type="text"/>
        </div>

        <div>
            <label class="block text-sm text-gray-700 mb-1" for="lastName">
                {{ $t('register.lastName') }}
            </label>
            <input id="lastName" v-model="lastName"
                   :placeholder="$t('register.lastNamePlaceholder')"
                   autocomplete="name"
                   class="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                   required type="text"/>
        </div>

        <div>
            <label class="block text-sm text-gray-700 mb-1" for="email">
                {{ $t('register.email') }}
            </label>
            <input id="email" v-model="email"
                   :placeholder="$t('register.emailPlaceholder')"
                   autocomplete="email"
                   class="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                   required type="email"/>
        </div>

        <!-- Password Fields (only show for registration) -->
        <div v-if="mode === 'register'">
            <label class="block text-sm text-gray-700 mb-1" for="password">
                {{ $t('register.password') }}
            </label>
            <input id="password" v-model="password"
                   :placeholder="$t('register.passwordPlaceholder')"
                   autocomplete="new-password"
                   class="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                   required type="password"/>
        </div>

        <div v-if="mode === 'register'">
            <label class="block text-sm text-gray-700 mb-1" for="confirmPassword">
                {{ $t('register.confirmPassword') }}
            </label>
            <input id="confirmPassword" v-model="confirmPassword"
                   :placeholder="$t('register.confirmPasswordPlaceholder')"
                   autocomplete="new-password"
                   class="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                   required type="password"/>
        </div>

        <!-- Phone Input -->
        <div>
            <label class="block text-sm text-gray-700 mb-1" for="phone">
                {{ $t('register.phone') }}
            </label>
            <div class="flex space-x-2">
                <select id="country" v-model="selectedCountry"
                        class="p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200">
                    <option v-for="country in countries" :key="country.code" :value="country.code">
                        {{ country.flag }} {{ country.prefix }}
                    </option>
                </select>
                <input id="phone" v-model="phoneLocal"
                       :placeholder="$t('register.phonePlaceholder')"
                       class="flex-1 p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                       type="tel"/>
            </div>
            <p v-if="phoneError" class="text-sm text-red-500 mt-1">{{ phoneError }}</p>
        </div>

        <!-- Address Autocomplete Section -->
        <AddressAutocomplete v-show="!address" @update:address="(updatedAddress) => address = updatedAddress" />

        <!-- Checkbox to confirm the selected address -->
        <div v-if="address" class="mt-2">
            <Checkbox v-model="addressConfirmed">
                <span>
                  <strong>{{ $t('register.confirmAddress') }}</strong><br />
                  {{ formatAddress(address) }}
                </span>
            </Checkbox>
        </div>

        <!-- Buttons Section -->
        <div v-if="mode === 'edit'" class="flex gap-2">
            <button type="button" @click="emit('close')"
                    class="w-1/2 bg-gray-100 text-gray-700 py-2 rounded-md hover:bg-gray-200 transition text-sm">
                {{ $t('common.cancel') }}
            </button>
            <button type="submit"
                    class="w-1/2 bg-black text-white py-2 rounded-md hover:bg-gray-800 transition text-sm">
                {{ submitButtonText }}
            </button>
        </div>
        <div v-else>
            <button type="submit"
                    class="w-full bg-black text-white py-2 rounded-md hover:bg-gray-800 transition">
                {{ submitButtonText }}
            </button>
        </div>
    </form>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { PhoneNumberFormat, PhoneNumberUtil } from 'google-libphonenumber'
import AddressAutocomplete from '~/components/form/AddressAutocomplete.vue'
import Checkbox from '~/components/Checkbox.vue'
import { formatAddress } from '~/utils/utils'
import type {Address, CreateUserRequest, UpdateUserRequest} from '~/types'

// Define props to allow passing initial values and mode
const props = defineProps({
    mode: {
        type: String,
        default: 'register'
    },
    initialValues: {
        type: Object,
        default: () => ({})
    }
})

// Define an emit event for form submission
const emit = defineEmits(['submit', 'close'])

const { t } = useI18n()
const phoneUtil = PhoneNumberUtil.getInstance()

// Reactive state with defaults and initial values
const firstName = ref(props.initialValues.firstName || '')
const lastName = ref(props.initialValues.lastName || '')
const email = ref(props.initialValues.email || '')
const password = ref('')
const confirmPassword = ref('')
const phoneLocal = ref(props.initialValues.phoneLocal || '')
const selectedCountry = ref(props.initialValues.selectedCountry || 'BE')

const address = ref<Address | null>(props.initialValues.address || null)
const addressConfirmed = ref<boolean>(props.initialValues.addressConfirmed || false)

const phoneError = ref('')

// Country list
const countries = [
    { prefix: '+31', code: 'NL', flag: '🇳🇱' },
    { prefix: '+32', code: 'BE', flag: '🇧🇪' },
    { prefix: '+33', code: 'FR', flag: '🇫🇷' },
    { prefix: '+352', code: 'LU', flag: '🇱🇺' },
    { prefix: '+44', code: 'DE', flag: '🇩🇪' },
]

// Computed property for formatted phone
const formattedPhone = computed(() => {
    try {
        const number = phoneUtil.parseAndKeepRawInput(phoneLocal.value, selectedCountry.value)
        return phoneUtil.format(number, PhoneNumberFormat.E164)
    } catch {
        return phoneLocal.value
    }
})

// Reset address confirmation when address changes
watch(address, () => {
    addressConfirmed.value = false
})

// When checked box becomes unchecked, reset address
watch(addressConfirmed, (newValue) => {
    if (newValue === false) {
        address.value = null
    }
})

// Phone validation function
const validatePhone = () => {
    try {
        const number = phoneUtil.parseAndKeepRawInput(phoneLocal.value, selectedCountry.value)
        phoneError.value = phoneUtil.isValidNumber(number) ? '' : t('register.invalidPhone')
        return !phoneError.value
    } catch {
        phoneError.value = t('register.invalidPhone')
        return false
    }
}

// Submit button text based on mode
const submitButtonText = computed(() => {
    return props.mode === 'edit' ? t('me.profile.update') : t('register.submit')
})

// Handle form submission
const handleSubmit = () => {
    // Example validations (expand as needed)
    if (phoneLocal.value && !validatePhone()) return
    if (props.mode === 'register' && password.value !== confirmPassword.value) return
    if (!firstName.value || !lastName.value || !email.value || (props.mode === 'register' && !password.value)) return
    if (address.value?.id && !addressConfirmed.value) return

    let form: CreateUserRequest | UpdateUserRequest;

    if (props.mode === 'register') {
        form = {
            firstName: firstName.value,
            lastName: lastName.value,
            email: email.value,
            password: password.value,
            phoneNumber: formattedPhone.value || null,
            addressId: addressConfirmed.value ? (address.value?.id || null) : null,
        } as CreateUserRequest;
    } else {
        form = {
            firstName: firstName.value,
            lastName: lastName.value,
            phoneNumber: formattedPhone.value || null,
            addressId: addressConfirmed.value ? (address.value?.id || null) : null,
        } as UpdateUserRequest;
    }

    // Emit the form data to the parent
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
input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
</style>
