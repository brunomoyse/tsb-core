import { type ReorderPlan, type ReorderSkipped, countUnits, planReorder } from '#engine/utils/reorder'
import { navigateTo, useCartStore, useLocalePath, useState } from '#imports'
import type { Order } from '~/types'
import { useI18n } from 'vue-i18n'
import { useNotificationsStore } from '~/stores/notifications'

/*
 * "Re-order" of a past order (audit M16).
 *
 *   1. `planReorder` (pure, utils/reorder.ts) turns the order's items into cart lines WITH their
 *      selections, and names the lines it cannot restore (product gone, a choice gone, group rules
 *      no longer met). Those lines are skipped, never half-restored; the toast says which, so the
 *      customer composes them again from the menu. This is the chosen answer to "incomplete lines":
 *      no line enters the cart that the backend would reject.
 *   2. An empty cart takes the order straight away. A cart that already has lines is never replaced
 *      silently: the shared prompt (<ReorderDialog>, mounted once in each layout) asks to Replace,
 *      Add to cart or Cancel.
 *   3. Whatever else is off (a price that moved, a rule the client has no data for) is flagged on the
 *      line by the server quote, as for any cart.
 *
 * The prompt lives in `useState`, so every caller (the /me widget, /me/orders) and the one dialog
 * share it.
 */

interface ReorderPrompt {
    plan: ReorderPlan
}

export type ReorderMode = 'replace' | 'merge'

export function useReorder() {
    const cartStore = useCartStore()
    const localePath = useLocalePath()
    const { t } = useI18n()
    const notifications = useNotificationsStore()
    const prompt = useState<ReorderPrompt | null>('reorder-prompt', () => null)
    // Shared with the checkout's cash amount field: a cleared amount is not "touched" any more.
    const cashTouched = useState('checkout-cash-touched', () => false)

    const skippedNames = (skipped: ReorderSkipped[]): string =>
        skipped.map((entry) => `${entry.name} (${t(`reorder.reason.${entry.reason}`)})`).join(', ')

    const apply = (plan: ReorderPlan, mode: ReorderMode) => {
        if (mode === 'replace') {
            // The lines (and what hangs off them: the coupon, a pending checkout), not the delivery settings.
            cartStore.products = []
            cartStore.couponCode = null
            cartStore.couponDiscountCents = 0
            cartStore.pendingOrderId = null
            // The cash amount was typed for the old total.
            cartStore.cashPaymentAmount = null
            cashTouched.value = false
        }
        for (const line of plan.lines) {
            cartStore.addProduct(line.product, line.quantity, {
                choice: line.choice,
                selections: line.selections,
            })
        }
        const added = countUnits(plan.lines)
        notifications.notify(plan.skipped.length > 0
            ? { message: t('reorder.partial', { added, names: skippedNames(plan.skipped) }), variant: 'info', duration: 9000 }
            : { message: t('reorder.success', { count: added }), variant: 'success' })
        navigateTo(localePath('/checkout'))
    }

    const reorder = (order: Order) => {
        const plan = planReorder(order.items)
        if (plan.lines.length === 0) {
            notifications.notify({
                message: plan.skipped.length > 0
                    ? t('reorder.emptyWithNames', { names: skippedNames(plan.skipped) })
                    : t('reorder.empty'),
                variant: 'error',
                duration: 9000,
            })
            return { added: 0, skipped: countUnits(plan.skipped) }
        }
        if (cartStore.products.length === 0) {
            apply(plan, 'replace')
        } else {
            prompt.value = { plan }
        }
        return { added: countUnits(plan.lines), skipped: countUnits(plan.skipped) }
    }

    const resolve = (mode: ReorderMode | null) => {
        const pending = prompt.value
        prompt.value = null
        if (pending && mode) apply(pending.plan, mode)
    }

    return { reorder, prompt, resolve }
}
