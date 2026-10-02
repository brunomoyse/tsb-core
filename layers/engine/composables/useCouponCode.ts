import { centsToDecimalString, toCents } from '#engine/utils/money'
import { describeCouponRefusal, describeGqlError } from '#engine/utils/gqlErrors'
import type { CouponValidation } from '#engine/types'
import gql from 'graphql-tag'
import { reportError } from '#engine/utils/reportError'
import { unwrapGqlError } from '#engine/utils/gqlError'
import { useCartStore } from '#engine/stores/cart'
import { useGqlMutation } from '#imports'
import { useI18n } from 'vue-i18n'
import { useOrderingPolicy } from '#engine/composables/useOrderingPolicy'

const VALIDATE_COUPON = gql`
    query ValidateCoupon($code: String!, $orderAmount: String!) {
        validateCoupon(code: $code, orderAmount: $orderAmount) {
            valid
            discountAmount
            errorMessage
            errorCode
        }
    }
`

/*
 * ROLLOUT FALLBACK, remove with the substring table in utils/gqlErrors.ts: a tsb-service from before
 * audit PR 2.3 has no `errorCode` field and rejects the query above ("Cannot query field"). Retry
 * once without it, and remember it so later attempts go straight to the old query.
 */
const VALIDATE_COUPON_LEGACY = gql`
    query ValidateCoupon($code: String!, $orderAmount: String!) {
        validateCoupon(code: $code, orderAmount: $orderAmount) {
            valid
            discountAmount
            errorMessage
        }
    }
`
let serverHasErrorCode = true

const isMissingErrorCodeField = (err: unknown): boolean => {
    const gqlError = unwrapGqlError(err)
    return Boolean(gqlError?.hasCode('GRAPHQL_VALIDATION_FAILED') && /errorCode/u.test(gqlError.message))
}

/**
 * Applying / removing a promo code on the cart. `apply` returns null on success, else the
 * translated reason the code was refused (never the backend's English text).
 *
 * This is the explicit "apply" action only. Once a code is on the cart, `useOrderQuote` re-checks it
 * with every quote (it follows the basket, and is removed with a message when it stops applying).
 *
 * A code the server REFUSES comes back as `valid: false` with an `errorCode` (shown as that reason).
 * A request that FAILED (offline, server error) throws and is shown as such: it never says "invalid
 * code" about a code that was not even checked.
 */
export function useCouponCode() {
    const cartStore = useCartStore()
    const { t } = useI18n()
    const { policy } = useOrderingPolicy()
    const { mutate: validate } = useGqlMutation<{ validateCoupon: CouponValidation }>(VALIDATE_COUPON)
    const { mutate: validateLegacy } = useGqlMutation<{ validateCoupon: CouponValidation }>(VALIDATE_COUPON_LEGACY)

    const request = async (code: string): Promise<CouponValidation> => {
        // The coupon is checked against the goods subtotal; the backend rechecks it on the real order.
        const variables = { code, orderAmount: centsToDecimalString(cartStore.subtotalCents) }
        if (serverHasErrorCode) {
            try {
                return (await validate(variables)).validateCoupon
            } catch (err: unknown) {
                if (!isMissingErrorCodeField(err)) throw err
                serverHasErrorCode = false
            }
        }
        return (await validateLegacy(variables)).validateCoupon
    }

    const apply = async (rawCode: string): Promise<string | null> => {
        const code = rawCode.trim()
        if (!code) return null
        try {
            const validation = await request(code)
            if (validation.valid) {
                cartStore.couponCode = code
                cartStore.couponDiscountCents = toCents(validation.discountAmount)
                return null
            }
            const refusal = describeCouponRefusal(validation, policy.value)
            return t(refusal.key, refusal.params ?? {})
        } catch (err: unknown) {
            reportError(err, 'coupon.validate')
            const described = describeGqlError(err, policy.value)
            // Not a refusal of the code: the request itself failed, so the generic "try again", not "invalid code".
            return t(described?.key ?? 'notify.errors.requestFailed', described?.params ?? {})
        }
    }

    const remove = () => {
        cartStore.couponCode = null
        cartStore.couponDiscountCents = 0
    }

    return { apply, remove }
}
