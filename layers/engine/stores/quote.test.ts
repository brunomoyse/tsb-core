// Quote store: the shared state of the server quote and its request cycle (wanted / settled / quote keys).
// Plain Pinia, no Nuxt: the store only holds state; `useOrderQuote` drives it.
// Run: `vp test run layers/engine/stores/quote.test.ts`.
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { useQuoteStore } from '#engine/stores/quote'
import { makeQuote, makeQuoteLine } from '../../../test/fixtures/quote'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('initial state', () => {
  it('has nothing wanted, settled or quoted', () => {
    const store = useQuoteStore()
    expect(store.quote).toBeNull()
    expect(store.quoteKey).toBe('')
    expect(store.lineKeys).toEqual([])
    expect(store.wantedKey).toBe('')
    expect(store.settledKey).toBe('')
    expect(store.error).toBeNull()
    expect(store.unsupported).toBe(false)
    expect(store.pending).toBe(false)
    expect(store.freshQuote).toBeNull()
    expect(store.lineIssues).toEqual({})
  })
})

describe('pending', () => {
  it('is true from the moment a key is wanted until a request for it settles', () => {
    const store = useQuoteStore()
    store.want('A')
    expect(store.pending).toBe(true)
    store.resolve('A', ['l1'], makeQuote())
    expect(store.pending).toBe(false)
  })

  it('a failure also settles the key (nothing stays pending), and keeps the error', () => {
    const store = useQuoteStore()
    const boom = new Error('network')
    store.want('A')
    store.fail('A', boom)
    expect(store.pending).toBe(false)
    expect(store.error).toBe(boom)
    expect(store.quote).toBeNull()
  })

  it('is pending again as soon as the cart asks for something else', () => {
    const store = useQuoteStore()
    store.want('A')
    store.resolve('A', [], makeQuote())
    store.want('B')
    expect(store.pending).toBe(true)
  })

  it('an empty key is never pending', () => {
    const store = useQuoteStore()
    store.want('')
    expect(store.pending).toBe(false)
  })
})

describe('want', () => {
  it('records the key without touching the quote that is already there', () => {
    const store = useQuoteStore()
    const quote = makeQuote({ total: '12.00' })
    store.want('A')
    store.resolve('A', ['l1'], quote)
    store.want('B')
    expect(store.wantedKey).toBe('B')
    // The old answer stays visible (its line issues too) until the next one replaces it.
    expect(store.quote).toEqual(quote)
    expect(store.quoteKey).toBe('A')
  })

  it('an empty key (empty cart) clears everything', () => {
    const store = useQuoteStore()
    store.want('A')
    store.resolve('A', ['l1'], makeQuote())
    store.want('')
    expect(store.wantedKey).toBe('')
    expect(store.quote).toBeNull()
    expect(store.quoteKey).toBe('')
    expect(store.lineKeys).toEqual([])
    expect(store.settledKey).toBe('')
  })
})

describe('resolve', () => {
  it('stores the quote with the key and line keys it answers, and clears a previous error', () => {
    const store = useQuoteStore()
    const quote = makeQuote()
    store.want('A')
    store.fail('A', new Error('x'))
    store.want('B')
    store.resolve('B', ['line-0'], quote)
    expect(store.quote).toEqual(quote)
    expect(store.quoteKey).toBe('B')
    expect(store.lineKeys).toEqual(['line-0'])
    expect(store.settledKey).toBe('B')
    expect(store.error).toBeNull()
  })
})

describe('freshQuote', () => {
  it('is the quote only while it answers the key the cart wants now', () => {
    const store = useQuoteStore()
    const quote = makeQuote()
    store.want('A')
    store.resolve('A', [], quote)
    expect(store.freshQuote).toEqual(quote)
    store.want('B')
    expect(store.freshQuote).toBeNull()
    store.want('A')
    expect(store.freshQuote).toEqual(quote)
  })

  it('is null for an empty key even if a quote is stored (nothing to quote)', () => {
    const store = useQuoteStore()
    store.$patch({ quote: makeQuote(), quoteKey: '', wantedKey: '' })
    expect(store.freshQuote).toBeNull()
  })

  it('is null after a failed request for the wanted key', () => {
    const store = useQuoteStore()
    store.want('A')
    store.resolve('A', [], makeQuote())
    store.want('B')
    store.fail('B', new Error('5xx'))
    expect(store.freshQuote).toBeNull()
    expect(store.pending).toBe(false)
  })
})

describe('reuse', () => {
  it('back to the inputs the quote answers: settles without a request and clears the error', () => {
    const store = useQuoteStore()
    const quote = makeQuote()
    store.want('A')
    store.resolve('A', [], quote)
    store.want('B')
    store.fail('B', new Error('x'))
    store.want('A')
    expect(store.pending).toBe(true)
    store.reuse('A')
    expect(store.pending).toBe(false)
    expect(store.error).toBeNull()
    expect(store.freshQuote).toEqual(quote)
  })
})

describe('lineIssues', () => {
  it('maps the issues of the last quote to the cart line keys of its request', () => {
    const store = useQuoteStore()
    const quote = makeQuote({
      lines: [
        makeQuoteLine(),
        makeQuoteLine({
          productId: 'gone',
          issues: [{ code: 'PRODUCT_NOT_FOUND', currentPrice: null }],
        }),
      ],
    })
    store.want('A')
    store.resolve('A', ['k1', 'k2'], quote)
    expect(store.lineIssues).toEqual({ k2: [{ code: 'PRODUCT_NOT_FOUND', currentPrice: null }] })
  })

  it('stays visible while the next quote is pending, and goes away with clear()', () => {
    const store = useQuoteStore()
    const quote = makeQuote({
      lines: [makeQuoteLine({ issues: [{ code: 'PRICE_CHANGED', currentPrice: '11.00' }] })],
    })
    store.want('A')
    store.resolve('A', ['k1'], quote)
    store.want('B')
    expect(store.lineIssues.k1).toHaveLength(1)
    store.clear()
    expect(store.lineIssues).toEqual({})
  })
})

describe('markUnsupported', () => {
  it('flags the backend as having no quoteOrder, wants nothing and drops the quote', () => {
    const store = useQuoteStore()
    store.want('A')
    store.resolve('A', ['k1'], makeQuote())
    store.want('B')
    store.markUnsupported()
    expect(store.unsupported).toBe(true)
    expect(store.wantedKey).toBe('')
    expect(store.pending).toBe(false)
    expect(store.quote).toBeNull()
    expect(store.lineKeys).toEqual([])
  })

  it('clear() does not reset the unsupported flag: an old backend is never asked again this session', () => {
    const store = useQuoteStore()
    store.markUnsupported()
    store.clear()
    expect(store.unsupported).toBe(true)
  })
})

describe('clear', () => {
  it('resets the quote, keys and error but not what the cart currently wants', () => {
    const store = useQuoteStore()
    store.want('A')
    store.fail('A', new Error('x'))
    store.clear()
    expect(store.error).toBeNull()
    expect(store.settledKey).toBe('')
    expect(store.wantedKey).toBe('A')
    expect(store.pending).toBe(true)
  })
})
