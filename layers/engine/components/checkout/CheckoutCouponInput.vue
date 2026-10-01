<template>
    <div class="mb-6">
        <!-- Persistent live region: the applied state is inserted already filled, which screen readers do not announce. -->
        <p role="status" aria-live="polite" class="sr-only" data-testid="coupon-status">{{ statusMessage }}</p>
        <h3 class="font-medium mb-2">
            {{ $t('coupon.title') }}
        </h3>

        <!-- Applied state -->
        <div v-if="cartStore.couponCode" data-testid="coupon-applied" class="flex items-center justify-between p-3 border border-primary-200 bg-tsb-four rounded-lg">
            <div class="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                <span class="text-sm text-primary-700 font-medium">
                    {{ $t('coupon.applied', { discount: formatCents(cartStore.couponDiscountCents) }) }}
                </span>
            </div>
            <button
                ref="removeButtonRef"
                type="button"
                data-testid="coupon-remove"
                class="min-h-11 inline-flex items-center rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none text-sm text-primary-700 hover:text-primary-800 font-medium underline underline-offset-2 decoration-primary-300 hover:decoration-primary-500"
                @click="removeCoupon"
            >
                {{ $t('coupon.remove') }}
            </button>
        </div>

        <!-- Input state -->
        <div v-else>
            <div class="flex gap-2">
                <input
                    ref="inputRef"
                    v-model="couponInput"
                    type="text"
                    data-testid="coupon-input"
                    :aria-label="$t('coupon.title')"
                    class="field flex-1 text-base sm:text-sm disabled:opacity-50"
                    :placeholder="$t('coupon.placeholder')"
                    :disabled="isValidating"
                    @keyup.enter="applyCoupon"
                />
                <UiButton
                    data-testid="coupon-apply"
                    :disabled="!couponInput.trim()"
                    :loading="isValidating"
                    @click="applyCoupon"
                >
                    {{ $t('coupon.apply') }}
                </UiButton>
            </div>
            <p v-if="errorMessage" role="alert" data-testid="coupon-error" class="text-sm text-red-700 mt-1">
                {{ errorMessage }}
            </p>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { nextTick, ref } from 'vue'
import { formatCents } from '#engine/lib/price'
import { useCartStore } from '#engine/stores/cart'
import { useCouponCode } from '#engine/composables/useCouponCode'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const cartStore = useCartStore()
const { apply, remove } = useCouponCode()

const couponInput = ref('')
const errorMessage = ref('')
const isValidating = ref(false)
const statusMessage = ref('')
// Applying swaps the input for the applied state (and removing swaps it back): focus follows to the new control instead of dropping to <body>.
const inputRef = ref<HTMLInputElement | null>(null)
const removeButtonRef = ref<HTMLButtonElement | null>(null)

const applyCoupon = async () => {
    if (!couponInput.value.trim()) return

    isValidating.value = true
    errorMessage.value = ''
    try {
        const refusal = await apply(couponInput.value)
        if (refusal) errorMessage.value = refusal
        else {
            couponInput.value = ''
            statusMessage.value = t('coupon.applied', { discount: formatCents(cartStore.couponDiscountCents) })
        }
    } finally {
        isValidating.value = false
    }
    await nextTick()
    // Applied: the "Remove" button is the new control. Refused: the (re-enabled) input, so the code can be corrected.
    if (cartStore.couponCode) removeButtonRef.value?.focus()
    else inputRef.value?.focus()
}

const removeCoupon = async () => {
    remove()
    couponInput.value = ''
    errorMessage.value = ''
    statusMessage.value = t('coupon.removed')
    await nextTick()
    inputRef.value?.focus()
}
</script>
