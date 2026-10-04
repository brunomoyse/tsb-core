// UseInvoiceDownload: downloads the PDF invoice of an order with the customer's OIDC token and saves it under the name the
// Server gives it; any failure is reported and shown as a toast. The HTTP call (fetch), the OIDC client and Sentry are the
// Boundaries; the anchor click that triggers the browser download is a spy.
// Run: `vp test run layers/engine/composables/useInvoiceDownload.nuxt.test.ts`.
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { setFlags } from '../../../test/flags'
import { useNotificationsStore } from '#engine/stores/notifications'
import { useRuntimeConfig } from '#imports'

const oidc = vi.hoisted(() => ({ getAccessToken: vi.fn<() => Promise<string | null>>() }))
const reportError = vi.hoisted(() => vi.fn())
vi.mock('#engine/composables/useOidc', () => ({ useOidc: () => oidc }))
vi.mock('#engine/utils/reportError', () => ({ reportError }))
vi.mock('vue-i18n', async (importOriginal) => {
  const { fakeI18n } = await import('../../../test/helpers/i18n')
  return { ...(await importOriginal<typeof import('vue-i18n')>()), useI18n: fakeI18n }
})

const { useInvoiceDownload } = await import('#engine/composables/useInvoiceDownload')

const fetchMock = vi.fn()
const createObjectURL = vi.fn(() => 'blob:invoice')
const revokeObjectURL = vi.fn()
let downloads: { href: string; download: string; attached: boolean }[]

const pdf = (disposition?: string) => {
  const headers = new Headers()
  if (disposition) headers.set('Content-Disposition', disposition)
  return new Response(new Blob(['%PDF-1.4']), { status: 200, headers })
}

beforeEach(() => {
  setActivePinia(createPinia())
  fetchMock.mockReset()
  reportError.mockReset()
  oidc.getAccessToken.mockReset().mockResolvedValue('token-123')
  createObjectURL.mockClear()
  revokeObjectURL.mockClear()
  vi.stubGlobal('fetch', fetchMock)
  window.URL.createObjectURL = createObjectURL
  window.URL.revokeObjectURL = revokeObjectURL
  downloads = []
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloads.push({ href: this.href, download: this.download, attached: this.isConnected })
  })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  useNotificationsStore().dismiss()
})

describe('downloadInvoice', () => {
  it('asks the API for the order invoice with the customer’s bearer token, and no cookies', async () => {
    fetchMock.mockResolvedValue(pdf())
    await useInvoiceDownload().downloadInvoice('order-42')
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      `${useRuntimeConfig().public.api}/orders/order-42/invoice`,
      { method: 'GET', credentials: 'omit', headers: { Authorization: 'Bearer token-123' } },
    )
  })

  it('saves the file under the name the server gives it (Content-Disposition)', async () => {
    fetchMock.mockResolvedValue(pdf('attachment; filename="FAC-2026-0042.pdf"'))
    await useInvoiceDownload().downloadInvoice('order-42')
    expect(downloads).toEqual([
      { href: 'blob:invoice', download: 'FAC-2026-0042.pdf', attached: true },
    ])
  })

  it('falls back to invoice-<order id>.pdf without a Content-Disposition header, or without a filename in it', async () => {
    fetchMock.mockResolvedValueOnce(pdf())
    await useInvoiceDownload().downloadInvoice('order-42')
    fetchMock.mockResolvedValueOnce(pdf('attachment'))
    await useInvoiceDownload().downloadInvoice('order-43')
    expect(downloads.map((d) => d.download)).toEqual([
      'invoice-order-42.pdf',
      'invoice-order-43.pdf',
    ])
  })

  it('cleans up after itself: the temporary link leaves the page and the object URL is released', async () => {
    fetchMock.mockResolvedValue(pdf())
    await useInvoiceDownload().downloadInvoice('order-42')
    expect(document.querySelector('a[download]')).toBeNull()
    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:invoice')
    expect(useNotificationsStore().current).toBeNull()
  })

  it('a visitor without a token still sends the request, just without the Authorization header', async () => {
    oidc.getAccessToken.mockResolvedValue(null)
    fetchMock.mockResolvedValue(pdf())
    await useInvoiceDownload().downloadInvoice('order-42')
    expect(fetchMock.mock.calls[0]![1].headers).toEqual({})
  })

  it('does not touch the OIDC client on the server', async () => {
    setFlags({ server: true })
    fetchMock.mockResolvedValue(pdf())
    await useInvoiceDownload().downloadInvoice('order-42')
    expect(oidc.getAccessToken).not.toHaveBeenCalled()
    expect(fetchMock.mock.calls[0]![1].headers).toEqual({})
  })
})

describe('failures', () => {
  const expectFailureToast = () => {
    expect(useNotificationsStore().current).toMatchObject({
      message: 'notify.errors.invoiceDownloadFailed',
      variant: 'error',
      duration: 5000,
      persistent: false,
    })
    expect(downloads).toEqual([])
    expect(createObjectURL).not.toHaveBeenCalled()
  }

  it('an HTTP error status (not yours, not found, server error) is reported and shown, nothing is downloaded', async () => {
    fetchMock.mockResolvedValue(new Response('nope', { status: 404 }))
    await useInvoiceDownload().downloadInvoice('order-42')
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Download failed' }),
      'invoice.download',
    )
    expectFailureToast()
  })

  it('a dropped connection is reported and shown', async () => {
    const offline = new TypeError('Failed to fetch')
    fetchMock.mockRejectedValue(offline)
    await useInvoiceDownload().downloadInvoice('order-42')
    expect(reportError).toHaveBeenCalledWith(offline, 'invoice.download')
    expectFailureToast()
  })

  it('a token that cannot be obtained (session gone) is reported and shown, and no request goes out', async () => {
    const expired = new Error('login required')
    oidc.getAccessToken.mockRejectedValue(expired)
    await useInvoiceDownload().downloadInvoice('order-42')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(reportError).toHaveBeenCalledWith(expired, 'invoice.download')
    expectFailureToast()
  })

  it('a body that cannot be read is a failure too', async () => {
    const broken = new Response('x')
    vi.spyOn(broken, 'blob').mockRejectedValue(new Error('stream aborted'))
    fetchMock.mockResolvedValue(broken)
    await useInvoiceDownload().downloadInvoice('order-42')
    expectFailureToast()
  })

  it('never throws to the caller: the button just stops spinning', async () => {
    fetchMock.mockRejectedValue(new Error('boom'))
    await expect(useInvoiceDownload().downloadInvoice('order-42')).resolves.toBeUndefined()
  })
})
