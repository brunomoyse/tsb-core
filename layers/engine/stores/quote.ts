// Stores: quote.ts

import { type OrderQuote, type QuoteLineIssue, lineIssuesByKey } from '#engine/utils/orderQuote'
import { defineStore } from 'pinia'

/*
 * The latest server quote of the cart (`quoteOrder`), shared by every surface: the cart drawers,
 * /cart and checkout all read this one state, and `useOrderQuote()` is what keeps it up to date.
 * Never persisted: a quote is only worth something for the cart it was asked for.
 *
 * Three keys describe the request cycle (see `quoteRequestKey`):
 *   wantedKey   what the cart asks for right now ('' = nothing to quote)
 *   settledKey  the key of the last request that finished, successfully or not
 *   quoteKey    the key `quote` answers
 * so  pending = wantedKey !== settledKey,  fresh = quoteKey === wantedKey.
 */
interface QuoteState {
    quote: OrderQuote | null
    quoteKey: string
    /** Cart line keys at the time of the request, in the request's item order: lines of `quote` map to them. */
    lineKeys: string[]
    wantedKey: string
    settledKey: string
    /** The last request failed (network, 5xx): totals fall back to the client's maths and nothing is blocked. */
    error: unknown
    /** The backend has no `quoteOrder` (an older service): never asked again this session. */
    unsupported: boolean
}

export const useQuoteStore = defineStore('quote', {
    state: (): QuoteState => ({
        quote: null,
        quoteKey: '',
        lineKeys: [],
        wantedKey: '',
        settledKey: '',
        error: null,
        unsupported: false,
    }),

    getters: {
        /** A request for the current inputs is on its way (or about to be sent). */
        pending: (state): boolean => state.wantedKey !== '' && state.wantedKey !== state.settledKey,
        /** The quote of the CURRENT inputs, or null while it is pending / failed / not asked. */
        freshQuote: (state): OrderQuote | null =>
            state.quote !== null && state.quoteKey !== '' && state.quoteKey === state.wantedKey ? state.quote : null,
        /** Line issues of the last quote by cart line key (stay visible until the next answer replaces them). */
        lineIssues: (state): Record<string, QuoteLineIssue[]> =>
            state.quote ? lineIssuesByKey(state.quote, state.lineKeys) : {},
    },

    actions: {
        /** The cart asks for a (new) quote. An empty key clears everything. */
        want(key: string): void {
            this.wantedKey = key
            if (key === '') this.clear()
        },
        resolve(key: string, lineKeys: string[], quote: OrderQuote): void {
            this.quote = quote
            this.quoteKey = key
            this.lineKeys = lineKeys
            this.settledKey = key
            this.error = null
        },
        /** The inputs are back to the ones `quote` answers: nothing is pending. */
        reuse(key: string): void {
            this.settledKey = key
            this.error = null
        },
        fail(key: string, error: unknown): void {
            this.settledKey = key
            this.error = error
        },
        markUnsupported(): void {
            this.unsupported = true
            this.wantedKey = ''
            this.clear()
        },
        clear(): void {
            this.quote = null
            this.quoteKey = ''
            this.lineKeys = []
            this.settledKey = ''
            this.error = null
        },
    },
})
