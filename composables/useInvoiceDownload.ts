import { eventBus } from '~/eventBus'
import { useI18n } from 'vue-i18n'
import { usePlatform } from '~/composables/usePlatform'
import { useRuntimeConfig } from '#imports'
import { useTokenStore } from '~/composables/useTokenStore'

export function useInvoiceDownload() {
    const config = useRuntimeConfig()
    const { t } = useI18n()
    const { isCapacitor } = usePlatform()
    const tokenStore = useTokenStore()

    const downloadInvoice = async (orderId: string) => {
        try {
            const headers: Record<string, string> = {}

            if (isCapacitor) {
                const accessToken = await tokenStore.getAccessToken()
                if (accessToken) {
                    headers['Authorization'] = `Bearer ${accessToken}`
                }
            }

            const response = await fetch(`${config.public.api}/orders/${orderId}/invoice`, {
                method: 'GET',
                credentials: isCapacitor ? 'omit' : 'include',
                headers,
            })
            if (!response.ok) throw new Error('Download failed')

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `invoice-${orderId}.pdf`
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
