<template>
    <div class="flex items-center justify-center bg-gray-50 p-4">
        <!-- Main Card -->
        <div class="max-w-2xl w-full bg-white rounded-xl shadow-sm p-6">
            <h1 data-testid="order-completed-title" class="text-2xl font-bold text-gray-900">
                {{ $t('orderCompleted.title', 'Order Completed') }}
            </h1>
            <p class="mt-3 text-gray-600 text-sm">
                {{ $t('orderCompleted.thankYou', 'Thank you for your purchase! Your order was placed successfully.') }}
            </p>

            <!-- Estimated arrival time / estimated ready time -->
            <div v-if="order && order.estimatedReadyTime" class="mt-4">
                <p class="text-sm text-gray-500">
                    <span v-if="order.type === 'DELIVERY'">
                        {{ $t('orderCompleted.estimatedDeliveredTime', 'Estimated delivered time:') }}
                    </span>
                    <span v-else>
                        {{ $t('orderCompleted.estimatedReadyTime', 'Estimated ready time:') }}
                    </span>
                    <strong class="text-gray-900">
                        {{ new Date(order.estimatedReadyTime).toLocaleString() }}
                    </strong>
                </p>
            </div>

            <!-- Order Details -->
            <div v-if="order" class="mt-6">
                <div class="space-y-5">
                    <!-- Items List -->
                    <div data-testid="order-completed-items" class="space-y-4">
                        <h3 class="text-sm font-semibold text-gray-900">
                            {{ $t('orderCompleted.items', 'Dishes:') }}
                        </h3>
                        <div class="space-y-2">
                            <div
                                v-for="(item, index) in order.items"
                                :key="index"
                                class="flex items-center justify-between p-3 rounded-lg border border-gray-100  bg-white transition-colors"
                            >
                                <div class="flex-1 min-w-0 pr-2">
                                    <p class="text-sm font-medium text-gray-900 truncate">
                                        <span v-if="item.product.code" class="text-gray-500">
                                            {{ item.product.code }} -
                                        </span>
                                        {{ item.product.category.name }} {{ item.product.name }}
                                    </p>
                                </div>
                                <span class="text-sm font-medium text-gray-700 shrink-0">
                                    x{{ item.quantity }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div v-if="order.status !== 'FAILED' && order.status !== 'CANCELLED'">
                    <h3 class="text-sm font-semibold text-gray-900 mt-6">
                        {{ $t('orderCompleted.status', 'Status') }}
                    </h3>
                    <OrderStatusTimeline
                        :order="order"
                        class="mt-6"
                    />
                </div>
                <div class="py-4 font-bold" v-else>
                    <p class="text-sm text-red-500">
                        {{ $t('orderCompleted.orderCanceled') }}
                    </p>
                </div>
            </div>

            <!-- Loading State -->
            <div v-else class="mt-6 p-4 rounded-lg bg-gray-50">
                <p class="text-sm text-gray-500">
                    {{ $t('orderCompleted.loading', 'Loading order details...') }}
                </p>
            </div>

            <!-- Navigation Actions -->
            <div class="mt-6 flex flex-col sm:flex-row gap-3">
                <NuxtLinkLocale
                    to="/me"
                    class="flex-1 flex items-center justify-center px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-red-300"
                >
                    {{ $t('orderCompleted.viewOrders', 'View My Orders') }}
                </NuxtLinkLocale>
                <button
                    v-if="order"
                    class="flex-1 flex items-center justify-center px-4 py-2.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                    @click="reorder(order)"
                >
                    {{ $t('reorder.button') }}
                </button>
                <NuxtLinkLocale
                    to="/"
                    class="flex items-center justify-center px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                    {{ $t('orderCompleted.returnHome', 'Return to Home') }}
                </NuxtLinkLocale>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import {
    definePageMeta,
    useCartStore,
    useGqlQuery,
    useGqlSubscription,
    useRoute,
    ref
} from '#imports'
import OrderStatusTimeline from '@/components/order/OrderStatusTimeline.vue'
import type { Order } from '@/types'
import gql from 'graphql-tag'
import { print } from 'graphql'
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useTracking } from '~/composables/useTracking'
import { useReorder } from '~/composables/useReorder'

definePageMeta({ public: false })

const route     = useRoute()
const cartStore = useCartStore()
const orderId   = route.params.orderId as string
const orderFailed = ref(false)
const { trackEvent } = useTracking()
const { reorder } = useReorder()

// 1) Fetch the order once (SSR)
const { data: dataOrder } = await useGqlQuery<{ myOrder: Order }>(
    print(gql`
        query ($orderId: ID!) {
            myOrder(id: $orderId) {
                id
                createdAt
                updatedAt
                status
                type
                isOnlinePayment
                discountAmount
                deliveryFee
                totalPrice
                estimatedReadyTime
                addressExtra
                orderNote
                orderExtra

                address {
                    streetName
                    municipalityName
                    postcode
                }
                customer {
                    id
                    firstName
                    lastName
                }
                payment {
                    status
                }
                items {
                    unitPrice
                    quantity
                    totalPrice
                    product {
                        id name code slug price pieceCount isAvailable isDiscountable isHalal isVegan isVisible
                        category { id name order }
                        choices { id productId priceModifier sortOrder name }
                    }
                    choice { id productId priceModifier sortOrder name }
                }
            }
        }
  `),
    { orderId }
)

const order = computed(() => dataOrder.value?.myOrder ?? null)

// Schema.org Order structured data
const config = useRuntimeConfig()
const { t } = useI18n()

watch(order, (orderData) => {
    if (!orderData) return

    useSchemaOrg([
        defineWebPage({
            '@type': 'WebPage',
            name: t('schema.orderConfirmation.title'),
            description: t('schema.orderConfirmation.description')
        }),
        {
            '@type': 'Order',
            '@id': `${config.public.baseUrl}/order-completed/${orderId}`,
            orderNumber: orderData.id,
            orderStatus: orderData.status === 'DELIVERED' || orderData.status === 'PICKED_UP' ? 'https://schema.org/OrderDelivered'
                : orderData.status === 'FAILED' || orderData.status === 'CANCELLED' ? 'https://schema.org/OrderCancelled'
                : orderData.status === 'PREPARING' || orderData.status === 'CONFIRMED' ? 'https://schema.org/OrderProcessing'
                : 'https://schema.org/OrderProblem',
            orderDate: orderData.createdAt,
            acceptedOffer: orderData.items.map(item => ({
                '@type': 'Offer',
                itemOffered: {
                    '@type': 'MenuItem',
                    name: item.product.name
                },
                price: item.unitPrice,
                priceCurrency: 'EUR',
                eligibleQuantity: {
                    '@type': 'QuantitativeValue',
                    value: item.quantity
                }
            })),
            customer: orderData.customer ? {
                '@type': 'Person',
                name: `${orderData.customer.firstName} ${orderData.customer.lastName}`
            } : undefined,
            broker: {
                '@type': 'Restaurant',
                name: t('schema.restaurantName')
            },
            orderDelivery: orderData.type === 'DELIVERY' && orderData.address ? {
                '@type': 'ParcelDelivery',
                expectedArrivalFrom: orderData.estimatedReadyTime,
                deliveryAddress: {
                    '@type': 'PostalAddress',
                    streetAddress: orderData.address.streetName,
                    addressLocality: orderData.address.municipalityName,
                    postalCode: orderData.address.postcode,
                    addressCountry: 'BE'
                }
            } : undefined
        }
    ])

    // SEO meta
    useSeoMeta({
        title: `Order #${orderData.id} - Tokyo Sushi Bar`,
        robots: 'noindex,nofollow' // Order pages should not be indexed
    })
}, { immediate: true })

// 2) subscribe to updates on mount
let closeWs: () => void = () => {}

onMounted(() => {
    // now destructure the `close` out of your updated composable
    const { data: liveUpdate, close } = useGqlSubscription<{
        myOrderUpdated: Partial<Order>
    }>(
        print(gql`
      subscription ($orderId: ID!) {
        myOrderUpdated(orderId: $orderId) { id status updatedAt estimatedReadyTime }
      }
    `),
        { orderId }
    )

    // store it
    closeWs = close

    watch(liveUpdate, (val) => {
        if (val?.myOrderUpdated?.status) {
            trackEvent('order_status_updated', {
                order_id: orderId,
                new_status: val.myOrderUpdated.status,
            })
        }

        if (val?.myOrderUpdated?.status === "FAILED" || val?.myOrderUpdated?.status === "CANCELLED") {
            orderFailed.value = true
        }

        if (val?.myOrderUpdated && dataOrder.value?.myOrder) {
            dataOrder.value.myOrder = {
                ...dataOrder.value.myOrder,
                ...val.myOrderUpdated,
            }
        }
    })

    cartStore.setCartVisibility(false)
    cartStore.resetState()

    // Track page view with order details
    if (order.value) {
        trackEvent('order_completed_page_viewed', {
            order_id: orderId,
            order_type: order.value.type,
            total_price: order.value.totalPrice,
            items_count: order.value.items?.length,
        })
    }
})

onUnmounted(() => {
    // only call if it's a real function
    if (typeof closeWs === 'function') {
        closeWs()
    }
})
</script>
