import {
  type PhoneInputState,
  classifyPhoneInput,
  formatPhoneForDisplay,
  looksLikeShortMobile,
} from '#engine/utils/phoneInput'
import { type Ref, computed, nextTick, ref, watch } from 'vue'
import { useAuthStore, useGqlMutation, useState } from '#imports'
import type { User } from '#engine/types'
import { reportError } from '#engine/utils/reportError'
import { useI18n } from 'vue-i18n'
import { useNotificationsStore } from '#engine/stores/notifications'

/*
 * Logic of the checkout phone capture (both brands, audit M22). The component keeps the markup.
 *
 * The field is validated when the customer is done with it, not while they type:
 *   - on blur: the error shows (an unfinished Belgian number says "incomplete", not "add the country code");
 *   - on Enter or the Save button: validate, and save only a valid number;
 *   - typing clears the error, and NEVER saves or collapses the field by itself.
 *
 * The draft (input, error, editing flag) lives in `useState`, so the checkout page can see it through its own call of
 * this composable: tapping Pay with a number typed but not yet saved commits it first (`commitPending`), instead of
 * ordering with the old number or telling the customer to "add" a number they just typed.
 */

// Shown (never blocking) under a valid number that looks like a mobile with a digit missing: see `looksLikeShortMobile`.
const SHORT_MOBILE_HINT_KEY = 'form.phoneMaybeMobile'

const messageKey = (state: PhoneInputState): string | null => {
  switch (state.kind) {
    case 'incomplete':
      return 'form.incompletePhone'
    case 'needsCountryCode':
      return 'checkout.phoneCapture.addCountryPrefix'
    case 'invalid':
      return 'form.invalidPhone'
    default:
      return null
  }
}

const UPDATE_ME = /* GraphQL */ `
  mutation ($input: UpdateUserInput!) {
    updateMe(input: $input) {
      id
      phoneNumber
    }
  }
`

export type PhoneCommitResult = 'none' | 'saved' | 'invalid'

// A save in flight (Save tapped, then Pay): the second caller waits for it instead of being dropped.
let inflightSave: Promise<boolean> | null = null

export function usePhoneCapture(phoneInputRef?: Ref<HTMLInputElement | null>) {
  const { t } = useI18n()
  const authStore = useAuthStore()
  const notifications = useNotificationsStore()
  const { mutate: mutationUpdateMe } = useGqlMutation<{
    updateMe: Pick<User, 'id' | 'phoneNumber'>
  }>(UPDATE_ME)

  const phoneLocal = useState('checkout-phone-draft', () => '')
  const phoneError = useState('checkout-phone-error', () => '')
  const isEditing = useState('checkout-phone-editing', () => false)
  // The number in the open field was accepted, but looks like a mobile one digit short.
  const draftLooksShortMobile = useState('checkout-phone-hint', () => false)
  const loading = ref(false)

  const savedNumber = computed(() => authStore.user?.phoneNumber ?? '')
  const saved = computed(() => Boolean(savedNumber.value))
  // What the collapsed card shows: the saved number in national format. The E.164 string until the formatter (a lazy
  // chunk) is loaded, and for a number it cannot read.
  const formattedNumber = ref('')
  watch(
    savedNumber,
    async (number) => {
      formattedNumber.value = ''
      if (!number) return
      const formatted = await formatPhoneForDisplay(number)
      // The number may have changed while the library loaded.
      if (number === savedNumber.value) formattedNumber.value = formatted
    },
    { immediate: true },
  )
  const savedNumberDisplay = computed(() => formattedNumber.value || savedNumber.value)
  // Collapsed: we have a saved number and the customer isn't actively editing.
  const isCollapsed = computed(() => saved.value && !isEditing.value)
  // Under the field, when there is no error to show: on the open field it follows the number typed and checked,
  // on the collapsed card it follows the saved number, so a number saved with the hint on screen keeps it.
  const phoneHint = computed(() => {
    const suspect = isCollapsed.value
      ? looksLikeShortMobile(savedNumber.value)
      : draftLooksShortMobile.value
    return suspect ? t(SHORT_MOBILE_HINT_KEY) : ''
  })
  // The field is open and holds something that is not saved yet (a new number, or an edit of the saved one).
  const hasUnsavedInput = computed(() => !isCollapsed.value && phoneLocal.value.trim() !== '')

  // Lazy-load libphonenumber-js (~75KB) only when the customer actually edits or submits a number.
  const startEditing = async () => {
    const current = authStore.user?.phoneNumber ?? ''
    phoneError.value = ''
    draftLooksShortMobile.value = false
    if (current) {
      const { parsePhoneNumberFromString } = await import('libphonenumber-js')
      const parsed = parsePhoneNumberFromString(current)
      if (parsed?.country === 'BE') phoneLocal.value = parsed.formatNational()
      else if (parsed) phoneLocal.value = parsed.formatInternational()
      else phoneLocal.value = current
    } else {
      phoneLocal.value = ''
    }
    isEditing.value = true
    await nextTick()
    phoneInputRef?.value?.focus()
  }

  const cancelEditing = () => {
    phoneError.value = ''
    draftLooksShortMobile.value = false
    isEditing.value = false
  }

  // Typing: a stale error must not outlive the edit that fixes it.
  const onInput = () => {
    phoneError.value = ''
    draftLooksShortMobile.value = false
  }

  const validate = async (): Promise<PhoneInputState> => {
    const state = await classifyPhoneInput(phoneLocal.value)
    const key = messageKey(state)
    // The capture was closed while the library loaded (Cancel): no stray error on a collapsed card.
    phoneError.value = key && !isCollapsed.value ? t(key) : ''
    draftLooksShortMobile.value =
      state.kind === 'valid' && looksLikeShortMobile(state.e164) && !isCollapsed.value
    return state
  }

  const onBlur = async () => {
    // Left empty: nothing to scold (Save explains that a number is needed).
    if (!phoneLocal.value.trim()) return
    await validate()
  }

  // Resolves true when the number is saved (or already was), false when it is not valid or the save failed.
  const submit = (): Promise<boolean> => {
    if (inflightSave) return inflightSave
    inflightSave = (async () => {
      const state = await validate()
      if (state.kind === 'empty') {
        phoneError.value = t('checkout.phoneCapture.requiredBeforeOrder')
        return false
      }
      if (state.kind !== 'valid') return false
      // Same number as the saved one: nothing to send.
      if (state.e164 === savedNumber.value) {
        isEditing.value = false
        return true
      }
      loading.value = true
      try {
        const res = await mutationUpdateMe({ input: { phoneNumber: state.e164 } })
        authStore.updateUser({ phoneNumber: res.updateMe.phoneNumber })
        isEditing.value = false
        notifications.notify({
          message: t('checkout.phoneCapture.saved'),
          persistent: false,
          duration: 3000,
          variant: 'success',
        })
        return true
      } catch (err) {
        reportError(err, 'checkout.savePhone')
        phoneError.value = t('notify.errors.profileUpdateFailed')
        return false
      } finally {
        loading.value = false
      }
    })().finally(() => {
      inflightSave = null
    })
    return inflightSave
  }

  /* The checkout calls this before it validates the order. A typed-but-unsaved number is saved first, so Pay
       uses what the customer sees. 'invalid' means the field keeps its error and the order must not go on. */
  const commitPending = async (): Promise<PhoneCommitResult> => {
    if (inflightSave) await inflightSave
    if (!hasUnsavedInput.value) return 'none'
    return (await submit()) ? 'saved' : 'invalid'
  }

  return {
    phoneLocal,
    phoneError,
    phoneHint,
    loading,
    isCollapsed,
    saved,
    savedNumber,
    savedNumberDisplay,
    hasUnsavedInput,
    startEditing,
    cancelEditing,
    onInput,
    onBlur,
    submit,
    commitPending,
  }
}
