import { eventBus } from '~/eventBus'
import { useI18n } from 'vue-i18n'
import { useRuntimeConfig } from '#imports'

export function useInvoiceDownload() {
    const config = useRuntimeConfig()
    const { t } = useI18n()

    const downloadInvoice = async (orderId: string) => {
        try {
            const headers: Record<string, string> = {}

            // Attach OIDC Bearer token
            if (import.meta.client) {
                const { useOidc } = await import('~/composables/useOidc')
                const { getAccessToken } = useOidc()
                const token = await getAccessToken()
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`
                }
            }

            const response = await fetch(`${config.public.api}/orders/${orderId}/invoice`, {
                method: 'GET',
                credentials: 'omit',
                headers,
            })
            if (!response.ok) throw new Error('Download failed')

            // Extract filename from Content-Disposition header, fallback to generic name
            const disposition = response.headers.get('Content-Disposition')
            let filename = `invoice-${orderId}.pdf`
            if (disposition) {
                const [, extracted] = disposition.match(/filename="(.+?)"/) ?? []
                if (extracted) filename = extracted
            }

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
        } catch {
            eventBus.emit('notify', {
                message: t('notify.errors.invoiceDownloadFailed'),
                persistent: false,
                duration: 5000,
                variant: 'error',
            })
        }
    }

    return { downloadInvoice }
}
