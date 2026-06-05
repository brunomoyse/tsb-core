/**
 * User-facing outcome of an online (Mollie) payment attempt.
 *
 * Mollie redirects back to our return URL for EVERY outcome — paid, canceled,
 * failed and expired alike — so the redirect itself tells us nothing. The
 * authoritative signal is the order's `payment.status`, set by the backend
 * webhook. `abandoned` is our own state for "the user left checkout before it
 * finalised" (payment still `open`/`pending`, order still unpaid).
 *
 * Mirrors tsb-mobile's `lib/paymentOutcome.ts` so both clients show the same
 * post-payment experience.
 */
export type PaymentOutcome = 'paid' | 'canceled' | 'failed' | 'expired' | 'abandoned'

/** Map a raw Mollie `payment.status` to a user-facing outcome. */
export function outcomeFromPaymentStatus(status: string | null | undefined): PaymentOutcome {
    switch (status) {
        case 'paid':
        case 'authorized':
            return 'paid'
        case 'canceled':
            return 'canceled'
        case 'failed':
            return 'failed'
        case 'expired':
            return 'expired'
        // `open` / `pending` / unknown → not finalised yet.
        default:
            return 'abandoned'
    }
}

/** Any outcome other than a confirmed payment needs the problem screen. */
export function isPaymentProblem(outcome: PaymentOutcome): boolean {
    return outcome !== 'paid'
}
