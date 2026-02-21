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

            <!-- Password Strength Indicator -->
            <div v-if="password" class="mt-2">
                <div class="flex items-center justify-between mb-1">
                    <span class="text-xs font-medium" :class="passwordStrength.color">
                        {{ passwordStrength.text }}
                    </span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                        class="h-1.5 rounded-full transition-all duration-300"
                        :class="passwordStrength.bgColor"
                        :style="{ width: passwordStrength.width }"
                    ></div>
                </div>
                <ul class="mt-2 space-y-1 text-xs text-gray-600">
                    <li :class="passwordRequirements.minLength ? 'text-green-600' : 'text-gray-500'">
                        {{ passwordRequirements.minLength ? '✓' : '○' }} {{ $t('register.passwordMinLength') }}
                    </li>
                    <li :class="passwordRequirements.hasUpperCase ? 'text-green-600' : 'text-gray-500'">
                        {{ passwordRequirements.hasUpperCase ? '✓' : '○' }} {{ $t('register.passwordUpperCase') }}
                    </li>
                    <li :class="passwordRequirements.hasLowerCase ? 'text-green-600' : 'text-gray-500'">
                        {{ passwordRequirements.hasLowerCase ? '✓' : '○' }} {{ $t('register.passwordLowerCase') }}
                    </li>
                    <li :class="passwordRequirements.hasNumber ? 'text-green-600' : 'text-gray-500'">
                        {{ passwordRequirements.hasNumber ? '✓' : '○' }} {{ $t('register.passwordNumber') }}
                    </li>
                    <li :class="passwordRequirements.hasSpecialChar ? 'text-green-600' : 'text-gray-500'">
                        {{ passwordRequirements.hasSpecialChar ? '✓' : '○' }} {{ $t('register.passwordSpecialChar') }}
                    </li>
                </ul>
            </div>
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
            <Checkbox v-if="mode === 'register'" v-model="addressConfirmed">
                <span>
                  <strong>{{ $t('register.confirmAddress') }}</strong><br />
                  {{ formatAddress(address) }}
                </span>
            </Checkbox>
            <div v-else class="p-3 border border-gray-300 rounded-md bg-gray-50">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <strong class="text-sm text-gray-700">{{ $t('register.address') }}</strong>
                        <p class="text-sm text-gray-600 mt-1">{{ formatAddress(address) }}</p>
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
import { parsePhoneNumberFromString } from 'libphonenumber-js'
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
    const parsed = parsePhoneNumberFromString(phoneLocal.value, selectedCountry.value as any)
    return parsed?.format('E.164') ?? phoneLocal.value
})

// Password strength validation
const passwordRequirements = computed(() => ({
    minLength: password.value.length >= 8,
    hasUpperCase: /[A-Z]/.test(password.value),
    hasLowerCase: /[a-z]/.test(password.value),
    hasNumber: /[0-9]/.test(password.value),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password.value),
}))

const passwordStrength = computed(() => {
    const reqs = passwordRequirements.value
    const score = [
        reqs.minLength,
        reqs.hasUpperCase,
        reqs.hasLowerCase,
        reqs.hasNumber,
        reqs.hasSpecialChar,
    ].filter(Boolean).length

    if (score === 0) {
        return {
            text: t('register.passwordVeryWeak'),
            color: 'text-red-600',
            bgColor: 'bg-red-500',
            width: '20%',
        }
    } else if (score <= 2) {
        return {
            text: t('register.passwordWeak'),
            color: 'text-red-600',
            bgColor: 'bg-red-500',
            width: '40%',
        }
    } else if (score === 3) {
        return {
            text: t('register.passwordFair'),
            color: 'text-orange-600',
            bgColor: 'bg-orange-500',
            width: '60%',
        }
    } else if (score === 4) {
        return {
            text: t('register.passwordGood'),
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-500',
            width: '80%',
        }
    } else {
        return {
            text: t('register.passwordStrong'),
            color: 'text-green-600',
            bgColor: 'bg-green-500',
            width: '100%',
        }
    }
})

// Reset address confirmation when address changes
watch(address, () => {
    // In edit mode, auto-confirm the address
    if (props.mode === 'edit') {
        addressConfirmed.value = address.value !== null
    } else {
        addressConfirmed.value = false
    }
})

// When checked box becomes unchecked in register mode, reset address
watch(addressConfirmed, (newValue) => {
    if (props.mode === 'register' && newValue === false) {
        address.value = null
    }
})

// Function to remove address
const removeAddress = () => {
    address.value = null
    addressConfirmed.value = false
}

// Phone validation function
const validatePhone = () => {
    const parsed = parsePhoneNumberFromString(phoneLocal.value, selectedCountry.value as any)
    phoneError.value = parsed?.isValid() ? '' : t('register.invalidPhone')
    return !phoneError.value
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
        // For edit mode, we need to explicitly handle address and phone removal
        // If there was an initial address but now there's none, send empty string to trigger deletion
        const hasInitialAddress = props.initialValues.address !== null && props.initialValues.address !== undefined
        const hasCurrentAddress = address.value !== null

        // Handle phone number deletion: if there was a phone initially but now it's empty, send empty string
        const hasInitialPhone = props.initialValues.phoneLocal && props.initialValues.phoneLocal.trim() !== ''
        const hasCurrentPhone = phoneLocal.value && phoneLocal.value.trim() !== ''

        let phoneValue = null
        if (hasCurrentPhone) {
            phoneValue = formattedPhone.value
        } else if (hasInitialPhone) {
            phoneValue = '' // Send empty string to trigger deletion
        }

        form = {
            firstName: firstName.value,
            lastName: lastName.value,
            phoneNumber: phoneValue,
            addressId: hasCurrentAddress ? address.value?.id || null : (hasInitialAddress ? '' : null),
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
