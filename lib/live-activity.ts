import { registerPlugin } from '@capacitor/core'

export interface StartActivityOptions {
    orderId: string
    orderType: 'DELIVERY' | 'PICKUP'
    totalPrice: string
    itemsSummary: string
    status: string
    estimatedReadyTime?: string // ISO 8601
}

export interface StartActivityResult {
    pushToken: string
    activityId: string
}

export interface UpdateActivityOptions {
    orderId: string
    status: string
    estimatedReadyTime?: string // ISO 8601
}

export interface EndActivityOptions {
    orderId: string
    finalStatus: string
}

export interface LiveActivityPlugin {
    startActivity(options: StartActivityOptions): Promise<StartActivityResult>
    updateActivity(options: UpdateActivityOptions): Promise<void>
    endActivity(options: EndActivityOptions): Promise<void>
    areActivitiesEnabled(): Promise<{ enabled: boolean }>
    addListener(
        eventName: 'pushTokenUpdate',
        listenerFunc: (data: { orderId: string; pushToken: string }) => void,
    ): Promise<{ remove: () => Promise<void> }>
}

const LiveActivity = registerPlugin<LiveActivityPlugin>('LiveActivity')

export default LiveActivity
