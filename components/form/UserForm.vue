<template>
    <form class="space-y-4" :class="{ 'animate-shake': isShaking }" @submit.prevent="handleSubmit">
        <!-- Personal Information Fields -->
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5" for="firstName">
                {{ $t('register.firstName') }}
            </label>
            <input id="firstName" v-model="firstName"
                   :placeholder="$t('register.firstNamePlaceholder')"
                   autocomplete="given-name"
                   class="w-full px-3.5 py-2.5 bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl text-gray-900 placeholder-gray-400 focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:border-red-300 focus-visible:outline-none transition-all duration-300"
                   required type="text"/>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5" for="lastName">
                {{ $t('register.lastName') }}
            </label>
            <input id="lastName" v-model="lastName"
                   :placeholder="$t('register.lastNamePlaceholder')"
                   autocomplete="name"
                   class="w-full px-3.5 py-2.5 bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl text-gray-900 placeholder-gray-400 focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:border-red-300 focus-visible:outline-none transition-all duration-300"
                   required type="text"/>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5" for="email">
                {{ $t('register.email') }}
            </label>
            <input id="email" v-model="email"
                   :placeholder="$t('register.emailPlaceholder')"
                   autocomplete="email"
                   class="w-full px-3.5 py-2.5 bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl text-gray-900 placeholder-gray-400 focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:border-red-300 focus-visible:outline-none transition-all duration-300"
                   required type="email"/>
        </div>

        <!-- Password Fields (only show for registration) -->
        <div v-if="mode === 'register'">
            <label class="block text-sm font-medium text-gray-700 mb-1.5" for="password">
                {{ $t('register.password') }}
            </label>
            <input id="password" v-model="password"
                   :placeholder="$t('register.passwordPlaceholder')"
                   autocomplete="new-password"
                   class="w-full px-3.5 py-2.5 bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl text-gray-900 placeholder-gray-400 focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:border-red-300 focus-visible:outline-none transition-all duration-300"
                   required type="password"/>

            <!-- Password Strength Indicator -->
            <div v-if="password" class="mt-2">
                <div class="flex items-center justify-between mb-1">
                    <span class="text-xs font-medium" :class="passwordStrength.color">
                        {{ passwordStrength.text }}
                    </span>
                </div>
                <div class="w-full bg-gray-200/60 rounded-full h-1.5">
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
            <label class="block text-sm font-medium text-gray-700 mb-1.5" for="confirmPassword">
                {{ $t('register.confirmPassword') }}
            </label>
            <div class="relative">
                <input id="confirmPassword" v-model="confirmPassword"
                       :placeholder="$t('register.confirmPasswordPlaceholder')"
                       autocomplete="new-password"
                       class="w-full px-3.5 py-2.5 pr-10 bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl text-gray-900 placeholder-gray-400 focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:border-red-300 focus-visible:outline-none transition-all duration-300"
                       required type="password"/>
                <svg
                    v-if="passwordsMatch"
                    xmlns="http://www.w3.org/2000/svg"
                    class="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
            </div>
        </div>

        <!-- Delivery Information Section (register only) -->
        <div v-if="mode === 'register'" class="border-t border-gray-300/50 pt-4 mt-2">
            <p class="text-sm font-medium text-gray-500">{{ $t('register.deliveryInfoTitle') }}</p>
            <p class="text-xs text-gray-400 mt-0.5">{{ $t('register.deliveryInfoDescription') }}</p>
        </div>

        <!-- Phone Input -->
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5" for="phone">
                {{ $t('register.phone') }}
            </label>
            <div class="flex space-x-2">
                <select id="country" v-model="selectedCountry"
                        class="px-2.5 py-2.5 bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl text-gray-900 focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:border-red-300 focus-visible:outline-none transition-all duration-300">
                    <option v-for="country in countries" :key="country.code" :value="country.code">
                        {{ country.flag }} {{ country.prefix }}
                    </option>
                </select>
                <input id="phone" v-model="phoneLocal"
                       :placeholder="$t('register.phonePlaceholder')"
                       class="flex-1 px-3.5 py-2.5 bg-white/60 backdrop-blur-sm border border-gray-200/80 rounded-xl text-gray-900 placeholder-gray-400 focus-visible:ring-2 focus-visible:ring-red-300/50 focus-visible:border-red-300 focus-visible:outline-none transition-all duration-300"
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
            <div v-else class="p-3 border border-gray-200/80 rounded-xl bg-white/40 backdrop-blur-sm">
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
                    class="w-1/2 bg-white/60 backdrop-blur-sm text-gray-700 py-2.5 rounded-xl border border-gray-200/80 hover:bg-white transition-all duration-300 text-sm active:scale-[0.97]">
                {{ $t('common.cancel') }}
            </button>
            <button type="submit"
                    class="w-1/2 bg-red-500 text-white py-2.5 rounded-xl font-medium hover:bg-red-600 transition-all duration-300 text-sm active:scale-[0.97] shadow-sm hover:shadow-md">
                {{ submitButtonText }}
            </button>
        </div>
        <div v-else>
            <button type="submit"
                    class="w-full bg-red-500 text-white py-2.5 rounded-xl font-medium hover:bg-red-600 transition-all duration-300 active:scale-[0.97] shadow-sm hover:shadow-md">
                {{ submitButtonText }}
            </button>
        </div>
    </form>
</template>

<script lang="ts" setup>
import type { Address, CreateUserRequest, UpdateUserRequest } from '~/types'
import { computed, ref, watch } from 'vue'
import AddressAutocomplete from '~/components/form/AddressAutocomplete.vue'
import Checkbox from '~/components/Checkbox.vue'
import { formatAddress } from '~/utils/utils'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { useI18n } from 'vue-i18n'

// Define props to allow passing initial values and mode
interface InitialValues {
    firstName?: string
    lastName?: string
    email?: string
    phoneLocal?: string
    selectedCountry?: string
    address?: Address | null
    addressConfirmed?: boolean
}

const { mode = 'register', initialValues = {} as InitialValues } = defineProps<{
    mode?: string
    initialValues?: InitialValues
}>()

// Define an emit event for form submission
const emit = defineEmits<{
    submit: [form: CreateUserRequest | UpdateUserRequest]
    close: []
}>()

const { t } = useI18n()

// Reactive state with defaults and initial values
const firstName = ref(initialValues.firstName || '')
const lastName = ref(initialValues.lastName || '')
const email = ref(initialValues.email || '')
const password = ref('')
const confirmPassword = ref('')
const phoneLocal = ref(initialValues.phoneLocal || '')
const selectedCountry = ref(initialValues.selectedCountry || 'BE')

const address = ref<Address | null>(initialValues.address || null)
const addressConfirmed = ref<boolean>(initialValues.addressConfirmed || false)

const phoneError = ref('')

const isShaking = ref(false)
const triggerShake = () => {
    isShaking.value = true
    setTimeout(() => { isShaking.value = false }, 400)
}

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

// Password match check
const passwordsMatch = computed(() =>
    password.value.length > 0 && confirmPassword.value.length > 0 && password.value === confirmPassword.value
)

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
    }
    return {
        text: t('register.passwordStrong'),
        color: 'text-green-600',
        bgColor: 'bg-green-500',
        width: '100%',
    }
})

// Reset address confirmation when address changes
watch(address, () => {
    // In edit mode, auto-confirm the address
    if (mode === 'edit') {
        addressConfirmed.value = address.value !== null
    } else {
        addressConfirmed.value = false
    }
})

// When checked box becomes unchecked in register mode, reset address
watch(addressConfirmed, (newValue) => {
    if (mode === 'register' && newValue === false) {
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
const submitButtonText = computed(() =>
    mode === 'edit' ? t('me.profile.update') : t('register.submit')
)

// Handle form submission
const handleSubmit = () => {
    // Example validations (expand as needed)
    if (phoneLocal.value && !validatePhone()) { triggerShake(); return }
    if (mode === 'register' && password.value !== confirmPassword.value) { triggerShake(); return }
    if (!firstName.value || !lastName.value || !email.value || (mode === 'register' && !password.value)) { triggerShake(); return }
    if (address.value?.id && !addressConfirmed.value) { triggerShake(); return }

    let form: CreateUserRequest | UpdateUserRequest;

    if (mode === 'register') {
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
        const hasInitialAddress = initialValues.address !== null && initialValues.address !== undefined
        const hasCurrentAddress = address.value !== null

        // Handle phone number deletion: if there was a phone initially but now it's empty, send empty string
        const hasInitialPhone = initialValues.phoneLocal && initialValues.phoneLocal.trim() !== ''
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
input, select, textarea {
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: #fca5a5;
    box-shadow: 0 0 0 3px rgba(252, 165, 165, 0.25);
}
</style>
