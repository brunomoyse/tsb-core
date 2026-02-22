<template>
    <div class="mb-6">
        <h3 class="font-medium mb-2">
            {{ $t('coupon.title') }}
        </h3>

        <!-- Applied state -->
        <div v-if="cartStore.couponCode" class="flex items-center justify-between p-3 border border-green-300 bg-green-50 rounded-lg">
            <div class="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                <span class="text-sm text-green-700 font-medium">
                    {{ $t('coupon.applied', { discount: formatPrice(cartStore.couponDiscount) }) }}
                </span>
            </div>
            <button
                type="button"
                class="text-sm text-red-600 hover:text-red-700 font-medium"
                @click="removeCoupon"
            >
                {{ $t('coupon.remove') }}
            </button>
        </div>

        <!-- Input state -->
        <div v-else>
            <div class="flex gap-2">
                <input
                    v-model="couponInput"
                    type="text"
                    class="flex-1 p-2 border border-gray-300 rounded-md focus:ring focus:ring-gray-200 text-sm"
                    :placeholder="$t('coupon.placeholder')"
                    :disabled="isValidating"
                    @keyup.enter="applyCoupon"
                />
                <button
                    type="button"
                    class="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-md hover:bg-red-600 transition-all active:scale-[0.97] disabled:bg-gray-300 disabled:cursor-not-allowed"
                    :disabled="!couponInput.trim() || isValidating"
                    @click="applyCoupon"
                >
                    <span v-if="isValidating" class="inline-flex items-center gap-1">
                        <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                    </span>
                    <span v-else>{{ $t('coupon.apply') }}</span>
                </button>
            </div>
            <p v-if="errorMessage" class="text-sm text-red-600 mt-1">
                {{ errorMessage }}
            </p>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { useCartStore } from '@/stores/cart'
import { useGqlMutation } from '#imports'
import { useI18n } from 'vue-i18n'
import { formatPrice } from '~/lib/price'
import gql from 'graphql-tag'
import type { CouponValidation } from '~/types'

const cartStore = useCartStore()
const { t } = useI18n()

const couponInput = ref('')
const errorMessage = ref('')
const isValidating = ref(false)

const VALIDATE_COUPON = gql`
    query ValidateCoupon($code: String!, $orderAmount: String!) {
        validateCoupon(code: $code, orderAmount: $orderAmount) {
            valid
            discountAmount
            errorMessage
        }
    }
`

const { mutate: validateCoupon } = useGqlMutation<{ validateCoupon: CouponValidation }>(VALIDATE_COUPON)

const applyCoupon = async () => {
    const code = couponInput.value.trim()
    if (!code) return

    isValidating.value = true
    errorMessage.value = ''

    try {
        const orderAmount = cartStore.totalPrice.toFixed(2)
        const res = await validateCoupon({ code, orderAmount })
        const validation = res.validateCoupon

        if (validation.valid) {
            cartStore.couponCode = code
            cartStore.couponDiscount = Number(validation.discountAmount)
            couponInput.value = ''
        } else {
            errorMessage.value = validation.errorMessage || t('coupon.invalid')
        }
    } catch {
        errorMessage.value = t('coupon.invalid')
    } finally {
        isValidating.value = false
    }
}

const removeCoupon = () => {
    cartStore.couponCode = null
    cartStore.couponDiscount = 0
    couponInput.value = ''
    errorMessage.value = ''
}
</script>
