<template>
    <div class="flex justify-center">
        <div class="w-[500px]">
            <h2 class="text-2xl font-semibold text-gray-900 text-center mb-4">
                {{ $t('register.title') }}
            </h2>

            <form class="space-y-4" @submit.prevent="registerUser">
                <!-- Personal Information Fields -->
                <div>
                    <label class="block text-sm text-gray-700 mb-1" for="fullName">
                        {{ $t('register.fullName') }}
                    </label>
                    <input id="fullName" v-model="fullName"
                           :placeholder="$t('register.fullNamePlaceholder')"
                           class="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                           required type="text"/>
                </div>

                <div>
                    <label class="block text-sm text-gray-700 mb-1" for="email">
                        {{ $t('register.email') }}
                    </label>
                    <input id="email" v-model="email"
                           :placeholder="$t('register.emailPlaceholder')"
                           class="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                           required type="email"/>
                </div>

                <!-- Password Fields -->
                <div>
                    <label class="block text-sm text-gray-700 mb-1" for="password">
                        {{ $t('register.password') }}
                    </label>
                    <input id="password" v-model="password"
                           :placeholder="$t('register.passwordPlaceholder')"
                           class="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                           required type="password"/>
                </div>

                <div>
                    <label class="block text-sm text-gray-700 mb-1" for="confirmPassword">
                        {{ $t('register.confirmPassword') }}
                    </label>
                    <input id="confirmPassword" v-model="confirmPassword"
                           :placeholder="$t('register.confirmPasswordPlaceholder')"
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
                            <option v-for="country in countries"
                                    :key="country.code"
                                    :value="country.code">
                                {{ country.flag }} {{ country.prefix }}
                            </option>
                        </select>
                        <input id="phone" v-model="phoneLocal"
                               :placeholder="$t('register.phonePlaceholder')"
                               class="flex-1 p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                               required type="tel"/>
                    </div>
                    <p v-if="phoneError" class="text-sm text-red-500 mt-1">{{ phoneError }}</p>
                </div>

                <!-- Address Autocomplete Section -->
                <AddressAutocomplete
                    @update:finalAddress="(address: Address) => finalAddress = address"
                />

                <!-- Hidden field storing finalAddress for the form -->
                <input type="hidden" v-model="finalAddress" />

                <button class="w-full bg-black text-white py-2 rounded-md hover:bg-gray-800 transition" type="submit">
                    {{ $t('register.submit') }}
                </button>
            </form>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { navigateTo, useAsyncData, useLocalePath, useNuxtApp } from '#imports'
import { useI18n } from 'vue-i18n'
import { PhoneNumberFormat, PhoneNumberUtil } from 'google-libphonenumber'
import AddressAutocomplete from "~/components/form/AddressAutocomplete.vue";
import type {Address} from "~/types";

const { $api } = useNuxtApp()
const { t } = useI18n()
const localePath = useLocalePath()
const phoneUtil = PhoneNumberUtil.getInstance()

// Reactive State
const fullName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const phoneLocal = ref('')
const selectedCountry = ref('BE')

const finalAddress = ref<Address | null>(null)
const phoneError = ref('')

// Computed Properties
const formattedPhone = computed(() => {
    try {
        const number = phoneUtil.parseAndKeepRawInput(phoneLocal.value, selectedCountry.value)
        return phoneUtil.format(number, PhoneNumberFormat.E164)
    } catch {
        return phoneLocal.value
    }
})

// Phone Validation
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

// Form Submission
const registerUser = async () => {
    if (!validatePhone()) return
    if (password.value !== confirmPassword.value) return
    if (!fullName.value || !email.value || !password.value) return

    const { error } = await useAsyncData('register', () =>
        $api('/register', {
            method: 'POST',
            body: {
                name: fullName.value,
                email: email.value,
                password: password.value,
                phoneNumber: formattedPhone.value ? formattedPhone.value : null,
                addressId: finalAddress.value ? finalAddress.value.id : null
            }
        })
    )

    if (!error.value) navigateTo(localePath('/login'))
}

// Country List
const countries = [
    { prefix: '+31', code: 'NL', flag: '🇳🇱' },
    { prefix: '+32', code: 'BE', flag: '🇧🇪' },
    { prefix: '+33', code: 'FR', flag: '🇫🇷' },
    { prefix: '+352', code: 'LU', flag: '🇱🇺' },
    { prefix: '+44', code: 'DE', flag: '🇩🇪' },
]
</script>

<style scoped>
@keyframes fadeIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
}
.animate-fadeIn {
    animation: fadeIn 0.2s ease-out;
}
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
