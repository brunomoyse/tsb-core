import type { Order } from '@/types'
import gql from 'graphql-tag'
import { print } from 'graphql'
import { usePlatform } from '~/composables/usePlatform'

const TERMINAL_STATUSES = ['DELIVERED', 'PICKED_UP', 'CANCELLED', 'FAILED']

const REGISTER_TOKEN = print(gql`
    mutation ($orderId: ID!, $pushToken: String!) {
        registerLiveActivityToken(orderId: $orderId, pushToken: $pushToken)
    }
`)

function isTerminal(status: string): boolean {
    return TERMINAL_STATUSES.includes(status)
}

function buildItemsSummary(order: Order): string {
    return order.items
        .slice(0, 3)
        .map(i => `${i.quantity}x ${i.product.name}`)
        .join(', ')
        + (order.items.length > 3 ? '...' : '')
}

export function useLiveActivity() {
    const { isIos } = usePlatform()
    const { $gqlFetch } = useNuxtApp()

    async function startIfEligible(order: Order) {
        if (!isIos) return

        try {
            const LiveActivity = (await import('~/lib/live-activity')).default

            const { enabled } = await LiveActivity.areActivitiesEnabled()
            if (!enabled) return

            if (isTerminal(order.status)) return

            const { pushToken } = await LiveActivity.startActivity({
                orderId: order.id,
                orderType: order.type as 'DELIVERY' | 'PICKUP',
                totalPrice: order.totalPrice,
                itemsSummary: buildItemsSummary(order),
                status: order.status,
                estimatedReadyTime: order.estimatedReadyTime ?? undefined,
            })

            // Register push token on backend for remote updates
            if (pushToken) {
                await registerToken(order.id, pushToken)
            }

            // Listen for token rotations
            LiveActivity.addListener('pushTokenUpdate', async (data) => {
                if (data.pushToken) {
                    await registerToken(data.orderId, data.pushToken)
                }
            })
        } catch {
            // Live Activity errors are non-critical — the order page still works via WebSocket
        }
    }

    async function onStatusUpdate(orderId: string, status: string, estimatedReadyTime?: string) {
        if (!isIos) return

        try {
            const LiveActivity = (await import('~/lib/live-activity')).default

            if (isTerminal(status)) {
                await LiveActivity.endActivity({ orderId, finalStatus: status })
            } else {
                await LiveActivity.updateActivity({
                    orderId,
                    status,
                    estimatedReadyTime,
                })
            }
        } catch {
            // Non-critical
        }
    }

    async function registerToken(orderId: string, pushToken: string) {
        try {
            await $gqlFetch(REGISTER_TOKEN, {
                variables: { orderId, pushToken },
            })
        } catch {
            // Token registration failure is non-critical
        }
    }

    return { startIfEligible, onStatusUpdate }
}
