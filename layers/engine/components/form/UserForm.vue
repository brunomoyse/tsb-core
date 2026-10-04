<template>
  <form class="space-y-4" :class="{ 'animate-shake': isShaking }" @submit.prevent="handleSubmit">
    <div>
      <label class="field-label" for="firstName">
        {{ $t('form.firstName') }}
      </label>
      <input
        id="firstName"
        v-model="firstName"
        :placeholder="$t('form.firstNamePlaceholder')"
        autocomplete="given-name"
        class="w-full px-3.5 py-2.5 bg-white/60 backdrop-blur-sm border border-neutral-200/80 rounded-xl text-neutral-900 placeholder-neutral-500 focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring focus-visible:outline-none transition-all duration-300"
        required
        type="text"
      />
    </div>

    <div>
      <label class="field-label" for="lastName">
        {{ $t('form.lastName') }}
      </label>
      <input
        id="lastName"
        v-model="lastName"
        :placeholder="$t('form.lastNamePlaceholder')"
        autocomplete="family-name"
        class="w-full px-3.5 py-2.5 bg-white/60 backdrop-blur-sm border border-neutral-200/80 rounded-xl text-neutral-900 placeholder-neutral-500 focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring focus-visible:outline-none transition-all duration-300"
        required
        type="text"
      />
    </div>

    <div>
      <label class="field-label" for="email">
        {{ $t('form.email') }}
      </label>
      <input
        id="email"
        v-model="email"
        :placeholder="$t('form.emailPlaceholder')"
        autocomplete="email"
        class="w-full px-3.5 py-2.5 bg-white/60 backdrop-blur-sm border border-neutral-200/80 rounded-xl text-neutral-900 placeholder-neutral-500 focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring focus-visible:outline-none transition-all duration-300"
        required
        type="email"
      />
    </div>

    <div>
      <label class="field-label" for="phone">
        {{ $t('form.phone') }}
      </label>
      <div class="flex space-x-2">
        <select
          id="country"
          v-model="selectedCountry"
          :aria-label="$t('form.phoneCountry')"
          class="w-36 min-w-0 shrink-0 px-2.5 py-2.5 bg-white/60 backdrop-blur-sm border border-neutral-200/80 rounded-xl text-neutral-900 focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring focus-visible:outline-none transition-all duration-300"
        >
          <option v-for="country in countries" :key="country.code" :value="country.code">
            {{ country.flag }} {{ getCountryName(country.code, locale) }} ({{ country.prefix }})
          </option>
        </select>
        <input
          id="phone"
          v-model="phoneLocal"
          :placeholder="$t('form.phonePlaceholder')"
          autocomplete="tel-national"
          :aria-invalid="phoneError ? 'true' : undefined"
          :aria-describedby="phoneError ? 'phone-error' : undefined"
          class="min-w-0 flex-1 px-3.5 py-2.5 bg-white/60 backdrop-blur-sm border border-neutral-200/80 rounded-xl text-neutral-900 placeholder-neutral-500 focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring focus-visible:outline-none transition-all duration-300"
          type="tel"
        />
      </div>
      <p v-if="phoneError" id="phone-error" class="text-sm text-red-700 mt-1">{{ phoneError }}</p>
    </div>

    <AddressAutocomplete
      v-show="!address"
      @update:address="(updatedAddress) => (address = updatedAddress)"
    />

    <div v-if="address" class="mt-2">
      <div class="p-3 border border-neutral-200/80 rounded-xl bg-white/40 backdrop-blur-sm">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <strong class="text-sm text-neutral-700">{{ $t('form.address.label') }}</strong>
            <p class="text-sm text-neutral-600 mt-1 whitespace-pre-line">
              {{ formatAddress(address) }}
            </p>
          </div>
          <button
            type="button"
            @click="removeAddress"
            class="ml-3 text-sm text-red-700 hover:text-red-800 font-medium"
          >
            {{ $t('common.remove') }}
          </button>
        </div>
      </div>
    </div>

    <div class="flex gap-2">
      <UiButton variant="secondary" class="flex-1" @click="emit('close')">
        {{ $t('common.cancel') }}
      </UiButton>
      <UiButton
        type="submit"
        class="flex-1"
        :disabled="submitting"
        :loading="submitting"
        data-testid="profile-submit"
      >
        {{ submitting ? $t('common.saving') : $t('me.profile.update') }}
      </UiButton>
    </div>
  </form>
</template>

<script lang="ts" setup>
import type { Address, UpdateUserRequest } from '#engine/types'
import { EUROPEAN_COUNTRIES, getCountryName } from '#engine/utils/europeanCountries'
import { ref, watch } from 'vue'
import AddressAutocomplete from '#engine/components/form/AddressAutocomplete.vue'
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

const { initialValues = {} as InitialValues, submitting = false } = defineProps<{
  initialValues?: InitialValues
  /** The update is on its way: the button is disabled and spins, so the form cannot be sent twice. */
  submitting?: boolean
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
  setTimeout(() => {
    isShaking.value = false
  }, 400)
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
  if (submitting) return
  const hasCurrentPhone = phoneLocal.value && phoneLocal.value.trim() !== ''
  let phoneE164: string | null = null
  if (hasCurrentPhone) {
    phoneE164 = await validatePhone()
    if (!phoneE164) {
      triggerShake()
      return
    }
  }
  if (!firstName.value || !lastName.value || !email.value) {
    triggerShake()
    return
  }

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
    addressPlaceId: hasCurrentAddress ? address.value?.id || null : hasInitialAddress ? '' : null,
  }

  emit('submit', form)
}
</script>

<style scoped>
input,
select,
textarea {
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}
/* Focus styling lives on the fields themselves (the `field` primitive and
   focus-visible:ring-ring utilities). A scoped `input:focus` box-shadow here
   outranked the ring and replaced it with a pale glow below 3:1 (audit A10). */
</style>
