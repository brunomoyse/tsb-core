import { GqlError, isAbortError } from './gqlError.ts'
import { type OrderQuote, isQuoteUnsupportedError } from './orderQuote.ts'
import type { QuoteOrderInput } from './orderPayload.ts'

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
 *   - an old backend (no `quoteOrder`) is detected once; the cycle then stops asking for good;
 *   - a request that gets no answer within `timeoutMs` is aborted and counts as a failed one, so a
 *     hung connection can never leave the cart "pending" (and the pay button disabled) for good;
 *   - `refresh()` asks again for the current inputs whatever is already answered, for the moments a
 *     SERVER-side change (a price, availability) matters and the cart itself did not move.
 */

/** A quote that takes longer than this is given up on (the surfaces fall back to the client's totals). */
export const QUOTE_TIMEOUT_MS = 8000

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
  /** Give up on a request after this long (default QUOTE_TIMEOUT_MS). */
  timeoutMs?: number
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
  /** Key of a `refresh()` in flight: announcing the same inputs again must not cancel it. */
  let refreshing = ''

  const cancel = () => {
    if (timer) clearTimeout(timer)
    timer = null
    controller?.abort()
    controller = null
    sequence += 1
    scheduled = ''
    refreshing = ''
  }

  /** Sends `request` now. Resolves with its quote, or null when it failed, was superseded or aborted. */
  const run = async (request: QuoteRequest): Promise<OrderQuote | null> => {
    controller?.abort()
    const own = new AbortController()
    controller = own
    const mine = ++sequence
    const timeoutMs = deps.timeoutMs ?? QUOTE_TIMEOUT_MS
    let timedOut = false
    let deadline: ReturnType<typeof setTimeout> | undefined
    // Raced against the transport: it may ignore the abort, and must not be waited on forever.
    const expiry = new Promise<never>((_, reject) => {
      deadline = setTimeout(() => {
        timedOut = true
        reject(
          GqlError.fromTransport(
            Object.assign(new Error(`Quote request timed out after ${timeoutMs} ms`), {
              name: 'TimeoutError',
            }),
          ),
        )
        own.abort()
      }, timeoutMs)
    })
    try {
      const sent = deps.send(request.input, own.signal)
      sent.catch(() => undefined) // Nobody listens once the race is lost
      const quote = await Promise.race([sent, expiry])
      if (mine !== sequence) return null // A newer request owns the state now
      scheduled = ''
      deps.store().resolve(request.key, request.lineKeys, quote)
      if (deps.isCurrent?.(request) ?? true) deps.onQuote?.(quote, request)
      return quote
    } catch (error: unknown) {
      if (mine !== sequence || (!timedOut && isAbortError(error))) return null
      scheduled = ''
      if (isQuoteUnsupportedError(error)) {
        deps.store().markUnsupported()
        return null
      }
      deps.onError?.(error)
      deps.store().fail(request.key, error)
      return null
    } finally {
      clearTimeout(deadline)
    }
  }

  const send = async () => {
    const request = latest
    timer = null
    if (!request) return
    await run(request)
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
      if (request.key === refreshing) return
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
    /**
     * Asks for the quote of the CURRENT inputs right now, even when it is already answered
     * (prices and availability can change on the server while the cart does not). Resolves with
     * the fresh quote, or null when there is nothing to ask, the backend has no `quoteOrder`, the
     * request failed / timed out, or the cart moved meanwhile: callers then carry on as before.
     */
    async refresh(): Promise<OrderQuote | null> {
      const store = deps.store()
      const request = latest
      if (store.unsupported || !request) return null
      if (timer) clearTimeout(timer)
      timer = null
      scheduled = request.key
      refreshing = request.key
      try {
        return await run(request)
      } finally {
        if (refreshing === request.key) refreshing = ''
      }
    },
    /** Nobody shows a quote any more: abort and forget what was asked. */
    stop(): void {
      cancel()
      latest = null
      deps.store().want('')
    },
  }
}
