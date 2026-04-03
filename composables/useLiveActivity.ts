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
        console.log('[LiveActivity] startIfEligible called, isIos:', isIos, 'status:', order.status)
        if (!isIos) return

        try {
            const { LiveActivity } = await import('capacitor-live-activity')

            const { value: enabled } = await LiveActivity.isAvailable()
            console.log('[LiveActivity] isAvailable:', enabled)
            if (!enabled) return

            if (isTerminal(order.status)) return

            // Listen for push token before starting activity
            LiveActivity.addListener('liveActivityPushToken', async (event) => {
                if (event.token) {
                    await registerToken(order.id, event.token)
                }
            })

            console.log('[LiveActivity] calling startActivityWithPush for order:', order.id)
            await LiveActivity.startActivityWithPush({
                id: order.id,
                attributes: {
                    orderId: order.id,
                    orderType: order.type,
                    restaurantName: 'Tokyo Sushi Bar',
                    itemsSummary: buildItemsSummary(order),
                },
                contentState: {
                    status: order.status,
                    estimatedReadyTime: order.estimatedReadyTime ?? '',
                },
            })
            console.log('[LiveActivity] started with push')
        } catch (e) {
            console.error('[LiveActivity] error:', e)
        }
    }

    async function onStatusUpdate(orderId: string, status: string, estimatedReadyTime?: string) {
        if (!isIos) return

        try {
            const { LiveActivity } = await import('capacitor-live-activity')

            if (isTerminal(status)) {
                await LiveActivity.endActivity({
                    id: orderId,
                    contentState: { status },
                })
            } else {
                await LiveActivity.updateActivity({
                    id: orderId,
                    contentState: {
                        status,
                        estimatedReadyTime: estimatedReadyTime ?? '',
                    },
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
