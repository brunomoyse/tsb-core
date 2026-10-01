import { type OrderQuote, isQuoteUnsupportedError } from './orderQuote.ts'
import type { QuoteOrderInput } from './orderPayload.ts'
import { isAbortError } from './gqlError.ts'

/*
 * The request cycle of the server quote, free of Vue / Nuxt so it can be tested with fake timers
 * (`quoteCycle.test.mjs`); `composables/useOrderQuote.ts` wires it to the cart and the Pinia store.
 *
 * One cycle is shared by every surface that shows the quote. Each time the cart changes, a surface
 * calls `request()` with what the cart asks for now:
 *   - the same inputs again are a no-op (a second surface announcing the same key costs nothing);
 *   - new inputs abort the request in flight, and are sent after `debounceMs` (at once for the first
 *     quote of a visit);
 *   - an answer that is not the latest request's is dropped, so a slow old answer never replaces a
 *     new one;
 *   - inputs that are already answered cancel whatever was asked in between;
 *   - an old backend (no `quoteOrder`) is detected once; the cycle then stops asking for good.
 */

export interface QuoteRequest {
    /** Identity of the inputs (`quoteRequestKey`). */
    key: string
    input: QuoteOrderInput
    /** Cart line keys in the request's item order, to map the answer back to lines later. */
    lineKeys: string[]
}

/** The part of the quote store the cycle drives (the Pinia store satisfies it as it is). */
export interface QuoteCycleStore {
    quoteKey: string
    settledKey: string
    unsupported: boolean
    want: (key: string) => void
    resolve: (key: string, lineKeys: string[], quote: OrderQuote) => void
    fail: (key: string, error: unknown) => void
    reuse: (key: string) => void
    markUnsupported: () => void
}

export interface QuoteCycleDeps {
    store: () => QuoteCycleStore
    send: (input: QuoteOrderInput, signal: AbortSignal) => Promise<OrderQuote>
    debounceMs: number
    /** An answer for the CURRENT inputs arrived (the coupon of the cart is re-checked here). */
    onQuote?: (quote: OrderQuote, request: QuoteRequest) => void
    /** A request failed for a reason that is not an abort or an old backend. */
    onError?: (error: unknown) => void
    /** True while the answer is still for the inputs the cart asks for (default: always). */
    isCurrent?: (request: QuoteRequest) => boolean
}

export function createQuoteCycle(deps: QuoteCycleDeps) {
    let scheduled = ''
    let timer: ReturnType<typeof setTimeout> | null = null
    let controller: AbortController | null = null
    let sequence = 0
    let latest: QuoteRequest | null = null

    const cancel = () => {
        if (timer) clearTimeout(timer)
        timer = null
        controller?.abort()
        controller = null
        sequence += 1
        scheduled = ''
    }

    const send = async () => {
        const request = latest
        timer = null
        if (!request) return
        controller?.abort()
        const own = new AbortController()
        controller = own
        const mine = ++sequence
        try {
            const quote = await deps.send(request.input, own.signal)
            if (mine !== sequence) return // A newer request owns the state now
            scheduled = ''
            deps.store().resolve(request.key, request.lineKeys, quote)
            if (deps.isCurrent?.(request) ?? true) deps.onQuote?.(quote, request)
        } catch (error: unknown) {
            if (isAbortError(error) || mine !== sequence) return
            scheduled = ''
            if (isQuoteUnsupportedError(error)) {
                deps.store().markUnsupported()
                return
            }
            deps.onError?.(error)
            deps.store().fail(request.key, error)
        }
    }

    return {
        /** The cart asks for this quote now; null = nothing to quote (empty cart). */
        request(request: QuoteRequest | null): void {
            const store = deps.store()
            if (store.unsupported) return
            if (request === null) {
                cancel()
                latest = null
                store.want('')
                return
            }
            latest = request
            store.want(request.key)
            if (request.key === store.quoteKey) {
                // Back to inputs that are already answered: drop whatever was asked meanwhile.
                cancel()
                store.reuse(request.key)
                return
            }
            // Already on its way / waiting for its timer.
            if (request.key === scheduled) return
            cancel()
            scheduled = request.key
            // The first quote of a visit goes out at once; later changes are debounced.
            timer = setTimeout(() => void send(), store.settledKey ? deps.debounceMs : 0)
        },
        /** Nobody shows a quote any more: abort and forget what was asked. */
        stop(): void {
            cancel()
            latest = null
            deps.store().want('')
        },
    }
}
