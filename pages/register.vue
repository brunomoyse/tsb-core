<template>
  <div class="flex justify-center">
    <div class="w-[500px]">
      <!-- Title -->
      <h2 class="text-2xl font-semibold text-gray-900 text-center mb-4">
        {{ $t('register.title') }}
      </h2>

      <!-- Registration Form -->
      <form @submit.prevent="registerUser" class="space-y-4">
        <!-- Full Name -->
        <div>
          <label for="fullName" class="block text-sm text-gray-700 mb-1">
            {{ $t('register.fullName') }}
          </label>
          <input id="fullName" v-model="fullName" type="text" name="fullName"
            :placeholder="$t('register.fullNamePlaceholder')" autocomplete="name" required
            class="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200" />
        </div>

        <!-- Email -->
        <div>
          <label for="email" class="block text-sm text-gray-700 mb-1">
            {{ $t('register.email') }}
          </label>
          <input id="email" v-model="email" type="email" name="email" :placeholder="$t('register.emailPlaceholder')"
            autocomplete="email" required
            class="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200" />
        </div>

        <!-- Password -->
        <div>
          <label for="password" class="block text-sm text-gray-700 mb-1">
            {{ $t('register.password') }}
          </label>
          <input id="password" v-model="password" type="password" name="password"
            :placeholder="$t('register.passwordPlaceholder')" autocomplete="new-password" required
            class="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200" />
        </div>

        <!-- Confirm Password -->
        <div>
          <label for="confirmPassword" class="block text-sm text-gray-700 mb-1">
            {{ $t('register.confirmPassword') }}
          </label>
          <input id="confirmPassword" v-model="confirmPassword" type="password" name="confirmPassword"
            :placeholder="$t('register.confirmPasswordPlaceholder')" autocomplete="new-password" required
            class="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200" />
        </div>

        <!-- Phone Number with Country Selector -->
        <div>
          <label for="phone" class="block text-sm text-gray-700 mb-1">
            {{ $t('register.phone') }}
          </label>
          <div class="flex space-x-2">
            <!-- Country selector with flags -->
            <select id="country" v-model="selectedCountry" name="country" autocomplete="off"
              class="p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200">
              <option v-for="country in countries" :key="country.code" :value="country.code">
                {{ country.flag }} {{ country.prefix }}
              </option>
            </select>
            <!-- Phone number input -->
            <input id="phone" v-model="phoneLocal" type="tel" name="phone" autocomplete="tel"
              :placeholder="$t('register.phonePlaceholder')" required
              class="flex-1 p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200" />
          </div>
          <p v-if="phoneError" class="text-sm text-red-500 mt-1">{{ phoneError }}</p>
        </div>

        <!-- Address with Autocompletion -->
        <div>
          <label for="address" class="block text-sm text-gray-700 mb-1">
            {{ $t('register.address') }}
          </label>
          <input id="address" v-model="address" type="text" name="address"
            :placeholder="$t('register.addressPlaceholder')" autocomplete="street-address"
            class="w-full p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200" />
          <!-- TODO: integrate geocoder API for address autocompletion -->
        </div>

        <!-- Submit Button -->
        <button type="submit" class="w-full bg-black text-white py-2 rounded-md hover:bg-gray-800 transition">
          {{ $t('register.submit') }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, useNuxtApp, navigateTo, computed, useLocalePath } from '#imports'
import { useI18n } from 'vue-i18n'
import { PhoneNumberUtil, PhoneNumberFormat } from 'google-libphonenumber'

const localePath = useLocalePath()

const { locale: userLocale, t } = useI18n()

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
  { prefix: '+31', code: 'NL', flag: '🇳🇱' },
  { prefix: '+32', code: 'BE', flag: '🇧🇪' },
  { prefix: '+33', code: 'FR', flag: '🇫🇷' },
  { prefix: '+352', code: 'LU', flag: '🇱🇺' },
  { prefix: '+44', code: 'DE', flag: '🇩🇪' },
]

const { $apiBaseUrl } = useNuxtApp()

// Validate and format phone number using google-libphonenumber.
const validatePhone = (): boolean => {
  console.log('Parsed number...')
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
  try {
    await $fetch(`${$apiBaseUrl()}/register`, {
      method: 'POST',
      headers: { 'Accept-Language': userLocale.value },
      body: {
        name: fullName.value,
        email: email.value,
        password: password.value,
        phone: formattedPhone.value,
        address: address.value,
      },
      credentials: 'include'
    })
    navigateTo(localePath('/login'))
  } catch (error) {
    console.error('Registration error:', error)
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