import { type PhoneInputState, classifyPhoneInput } from '#engine/utils/phoneInput'
import { type Ref, computed, nextTick, ref } from 'vue'
import { useAuthStore, useGqlMutation } from '#imports'
import type { User } from '#engine/types'
import gql from 'graphql-tag'
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
 */

const messageKey = (state: PhoneInputState): string | null => {
    switch (state.kind) {
        case 'incomplete': return 'form.incompletePhone'
        case 'needsCountryCode': return 'checkout.phoneCapture.addCountryPrefix'
        case 'invalid': return 'form.invalidPhone'
        default: return null
    }
}

const UPDATE_ME = gql`
    mutation ($input: UpdateUserInput!) {
        updateMe(input: $input) {
            id
            phoneNumber
        }
    }
`

export function usePhoneCapture(phoneInputRef: Ref<HTMLInputElement | null>) {
    const { t } = useI18n()
    const authStore = useAuthStore()
    const notifications = useNotificationsStore()
    const { mutate: mutationUpdateMe } = useGqlMutation<{ updateMe: Pick<User, 'id' | 'phoneNumber'> }>(UPDATE_ME)

    const phoneLocal = ref('')
    const phoneError = ref('')
    const loading = ref(false)
    const isEditing = ref(false)

    const savedNumber = computed(() => authStore.user?.phoneNumber ?? '')
    const saved = computed(() => Boolean(savedNumber.value))
    // Collapsed: we have a saved number and the customer isn't actively editing.
    const isCollapsed = computed(() => saved.value && !isEditing.value)

    // Lazy-load libphonenumber-js (~75KB) only when the customer actually edits or submits a number.
    const startEditing = async () => {
        const current = authStore.user?.phoneNumber ?? ''
        phoneError.value = ''
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
        phoneInputRef.value?.focus()
    }

    const cancelEditing = () => {
        phoneError.value = ''
        isEditing.value = false
    }

    // Typing: a stale error must not outlive the edit that fixes it.
    const onInput = () => { phoneError.value = '' }

    const validate = async (): Promise<PhoneInputState> => {
        const state = await classifyPhoneInput(phoneLocal.value)
        const key = messageKey(state)
        // The capture was closed while the library loaded (Cancel): no stray error on a collapsed card.
        phoneError.value = key && !isCollapsed.value ? t(key) : ''
        return state
    }

    const onBlur = async () => {
        // Left empty: nothing to scold (Save explains that a number is needed).
        if (!phoneLocal.value.trim()) return
        await validate()
    }

    const submit = async () => {
        if (loading.value) return
        const state = await validate()
        if (state.kind === 'empty') {
            phoneError.value = t('checkout.phoneCapture.requiredBeforeOrder')
            return
        }
        if (state.kind !== 'valid') return
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
        } catch (err) {
            reportError(err, 'checkout.savePhone')
            phoneError.value = t('notify.errors.profileUpdateFailed')
        } finally {
            loading.value = false
        }
    }

    return { phoneLocal, phoneError, loading, isCollapsed, saved, savedNumber, startEditing, cancelEditing, onInput, onBlur, submit }
}
