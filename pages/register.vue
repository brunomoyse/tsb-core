<template>
    <div class="flex justify-center">
        <div class="w-[500px]">
            <!-- Title -->
            <h2 class="text-2xl font-semibold text-gray-900 text-center mb-4">
                {{ $t('register.title') }}
            </h2>

            <!-- Registration Form -->
            <form class="space-y-4" @submit.prevent="registerUser">
                <!-- Full Name -->
                <div>
                    <label class="block text-sm text-gray-700 mb-1" for="fullName">
                        {{ $t('register.fullName') }}
                    </label>
                    <input id="fullName" v-model="fullName" :placeholder="$t('register.fullNamePlaceholder')"
                           autocomplete="name"
                           class="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                           name="fullName" required
                           type="text"/>
                </div>

                <!-- Email -->
                <div>
                    <label class="block text-sm text-gray-700 mb-1" for="email">
                        {{ $t('register.email') }}
                    </label>
                    <input id="email" v-model="email" :placeholder="$t('register.emailPlaceholder')"
                           autocomplete="email"
                           class="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                           name="email" required
                           type="email"/>
                </div>

                <!-- Password -->
                <div>
                    <label class="block text-sm text-gray-700 mb-1" for="password">
                        {{ $t('register.password') }}
                    </label>
                    <input id="password" v-model="password" :placeholder="$t('register.passwordPlaceholder')"
                           autocomplete="new-password"
                           class="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                           name="password" required
                           type="password"/>
                </div>

                <!-- Confirm Password -->
                <div>
                    <label class="block text-sm text-gray-700 mb-1" for="confirmPassword">
                        {{ $t('register.confirmPassword') }}
                    </label>
                    <input id="confirmPassword" v-model="confirmPassword"
                           :placeholder="$t('register.confirmPasswordPlaceholder')" autocomplete="new-password"
                           class="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                           name="confirmPassword" required
                           type="password"/>
                </div>

                <!-- Phone Number with Country Selector -->
                <div>
                    <label class="block text-sm text-gray-700 mb-1" for="phone">
                        {{ $t('register.phone') }}
                    </label>
                    <div class="flex space-x-2">
                        <!-- Country selector with flags -->
                        <select id="country" v-model="selectedCountry" autocomplete="off"
                                class="p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                                name="country">
                            <option v-for="country in countries" :key="country.code" :value="country.code">
                                {{ country.flag }} {{ country.prefix }}
                            </option>
                        </select>
                        <!-- Phone number input -->
                        <input id="phone" v-model="phoneLocal" :placeholder="$t('register.phonePlaceholder')"
                               autocomplete="tel"
                               class="flex-1 p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                               name="phone" required
                               type="tel"/>
                    </div>
                    <p v-if="phoneError" class="text-sm text-red-500 mt-1">{{ phoneError }}</p>
                </div>

                <!-- Address with Autocompletion -->
                <div>
                    <label class="block text-sm text-gray-700 mb-1" for="address">
                        {{ $t('register.address') }}
                    </label>
                    <input id="address" v-model="address" :placeholder="$t('register.addressPlaceholder')"
                           autocomplete="street-address"
                           class="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200"
                           name="address"
                           type="text"/>
                    <!-- TODO: integrate geocoder API for address autocompletion -->
                </div>

                <!-- Submit Button -->
                <button class="w-full bg-black text-white py-2 rounded-md hover:bg-gray-800 transition" type="submit">
                    {{ $t('register.submit') }}
                </button>
            </form>
        </div>
    </div>
</template>

<script lang="ts" setup>
import {computed, navigateTo, ref, useAsyncData, useLocalePath, useNuxtApp} from '#imports'
import {useI18n} from 'vue-i18n'
import {PhoneNumberFormat, PhoneNumberUtil} from 'google-libphonenumber'

const localePath = useLocalePath()
const {$api} = useNuxtApp()
const {locale: userLocale, t} = useI18n()

const phoneUtil = PhoneNumberUtil.getInstance()

const fullName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const phoneLocal = ref('')
const address = ref('')
const selectedCountry = ref('BE') // Default country code.

const phoneError = ref('')

const countries = [
    {prefix: '+31', code: 'NL', flag: '🇳🇱'},
    {prefix: '+32', code: 'BE', flag: '🇧🇪'},
    {prefix: '+33', code: 'FR', flag: '🇫🇷'},
    {prefix: '+352', code: 'LU', flag: '🇱🇺'},
    {prefix: '+44', code: 'DE', flag: '🇩🇪'},
]

// Validate and format phone number using google-libphonenumber.
const validatePhone = (): boolean => {
    try {
        const number = phoneUtil.parseAndKeepRawInput(phoneLocal.value, selectedCountry.value)

        if (!phoneUtil.isValidNumber(number)) {
            phoneError.value = t('register.invalidPhone')
            return false
        }
        phoneError.value = ''
        return true
    } catch (error) {
        console.error('Phone validation error:', error)
        phoneError.value = t('register.invalidPhone')
        return false
    }
}

const formattedPhone = computed(() => {
    if (!phoneLocal.value) return ''
    try {
        const number = phoneUtil.parseAndKeepRawInput(phoneLocal.value, selectedCountry.value)
        return phoneUtil.format(number, PhoneNumberFormat.E164)
    } catch (error) {
        console.error('Phone formatting error:', error)
        return phoneLocal.value
    }
})

// Register user.
const registerUser = async () => {
    // Validate required fields.
    if (!fullName.value || !email.value || !password.value || !phoneLocal.value) {
        console.error('Missing required fields')
        return
    }

    // Check if both passwords match.
    if (password.value !== confirmPassword.value) {
        console.error('Passwords do not match')
        return
    }

    if (!validatePhone()) {
        console.error('Invalid phone number')
        return
    }
    const {error} = await useAsyncData('register', () =>
        $api('/register', {
            method: 'POST',
            headers: {
                'Accept-Language': userLocale.value
            },
            body: {
                name: fullName.value,
                email: email.value,
                password: password.value,
                phone: formattedPhone.value,
                address: address.value,
            }
        })
    )

    if (!error.value) {
        navigateTo(localePath('/login'))
    } else {
        console.error('Registration error:', error.value)
    }
}
</script>

<style scoped>
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: scale(0.95);
    }

    to {
        opacity: 1;
        transform: scale(1);
    }
}

.animate-fadeIn {
    animation: fadeIn 0.2s ease-out;
}
</style>
