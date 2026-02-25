<template>
    <div class="min-h-calc flex flex-col items-center px-4 pt-8 pb-12 sm:pt-12 sm:pb-16">

        <!-- Hero: Bag + Title -->
        <div class="relative flex flex-col items-center w-full max-w-md">

            <!-- Falling cherry blossom petals (decorative) -->
            <div class="absolute inset-0 -inset-x-16 pointer-events-none overflow-hidden" aria-hidden="true">
                <span class="oc-petal oc-petal-1" />
                <span class="oc-petal oc-petal-2" />
                <span class="oc-petal oc-petal-3" />
                <span class="oc-petal oc-petal-4" />
                <span class="oc-petal oc-petal-5" />
                <span class="oc-petal oc-petal-6" />
                <span class="oc-petal oc-petal-7" />
                <span class="oc-petal oc-petal-8" />
                <span class="oc-petal oc-petal-9" />
                <span class="oc-petal oc-petal-10" />
                <span class="oc-petal oc-petal-11" />
                <span class="oc-petal oc-petal-12" />
            </div>

            <!-- Takeaway bag with float animation -->
            <div class="oc-bag-wrapper">
                <picture>
                    <source srcset="/images/tsb-takeaway-bag.avif" type="image/avif" />
                    <source srcset="/images/tsb-takeaway-bag.webp" type="image/webp" />
                    <img
                        src="/images/tsb-takeaway-bag.png"
                        alt=""
                        class="oc-bag-image"
                        width="180"
                        height="216"
                    />
                </picture>
                <div class="oc-bag-shadow" />
            </div>

            <!-- Title -->
            <h1
                data-testid="order-completed-title"
                class="mt-5 text-2xl sm:text-3xl font-bold text-gray-900 text-center oc-stagger-1"
            >
                {{ $t('orderCompleted.title') }}
            </h1>

            <!-- Subtitle -->
            <p class="mt-2 text-gray-500 text-sm sm:text-base text-center max-w-xs oc-stagger-2">
                {{ $t('orderCompleted.thankYou') }}
                <br />
                {{ $t('orderCompleted.orderSuccess') }}
            </p>

            <!-- Estimated time badge -->
            <div
                v-if="order && order.estimatedReadyTime"
                class="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-tsb-four text-sm font-medium text-red-700 oc-stagger-3"
            >
                <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>
                    <template v-if="order.type === 'DELIVERY'">
                        {{ $t('orderCompleted.estimatedDeliveredTime', 'Estimated delivered time:') }}
                    </template>
                    <template v-else>
                        {{ $t('orderCompleted.estimatedReadyTime', 'Estimated ready time:') }}
                    </template>
                    <strong>{{ new Date(order.estimatedReadyTime).toLocaleString() }}</strong>
                </span>
            </div>
        </div>

        <!-- Order details card -->
        <div v-if="order" class="mt-8 w-full max-w-lg oc-stagger-4">
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                <!-- Items list -->
                <div data-testid="order-completed-items" class="p-5">
                    <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        {{ $t('orderCompleted.items') }}
                    </h3>
                    <div class="space-y-1">
                        <div
                            v-for="(item, index) in order.items"
                            :key="index"
                            class="flex items-center justify-between py-2.5 px-3 rounded-xl transition-colors hover:bg-tsb-one"
                        >
                            <div class="flex-1 min-w-0 pr-3">
                                <p class="text-sm font-medium text-gray-900 truncate">
                                    <span v-if="item.product.code" class="text-gray-400 font-normal">
                                        {{ item.product.code }}
                                    </span>
                                    {{ item.product.category.name }} {{ item.product.name }}
                                </p>
                            </div>
                            <span class="text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-2.5 py-0.5 shrink-0">
                                x{{ item.quantity }}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Status timeline -->
                <div v-if="order.status !== 'FAILED' && order.status !== 'CANCELLED'" class="border-t border-gray-100 p-5">
                    <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                        {{ $t('orderCompleted.status') }}
                    </h3>
                    <OrderStatusTimeline :order="order" />

                    <!-- Live tracking hint -->
                    <div class="mt-4 flex items-center gap-2 text-xs text-gray-400">
                        <span class="relative flex h-2 w-2 shrink-0">
                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                        </span>
                        {{ $t('orderCompleted.liveTracking') }}
                    </div>
                </div>

                <!-- Failed / Cancelled -->
                <div v-else class="border-t border-gray-100 p-5">
                    <p class="text-sm text-red-500 font-medium">
                        {{ $t('orderCompleted.orderCanceled') }}
                    </p>
                </div>
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="orderError" class="mt-8 w-full max-w-lg p-5 rounded-2xl bg-red-50 border border-red-100 oc-stagger-4">
            <p class="text-sm text-red-600">
                {{ $t('orderCompleted.loadError') }}
            </p>
        </div>

        <!-- Loading State -->
        <div v-else class="mt-8 w-full max-w-lg oc-stagger-4">
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div class="flex items-center gap-3">
                    <div class="w-5 h-5 border-2 border-gray-300 border-t-red-400 rounded-full animate-spin" />
                    <p class="text-sm text-gray-500">{{ $t('orderCompleted.loading') }}</p>
                </div>
            </div>
        </div>

        <!-- Actions -->
        <div class="mt-6 w-full max-w-lg flex flex-col sm:flex-row gap-3 oc-stagger-5">
            <NuxtLinkLocale
                to="/me"
                class="flex-1 flex items-center justify-center px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2"
            >
                {{ $t('orderCompleted.viewOrders') }}
            </NuxtLinkLocale>
            <NuxtLinkLocale
                to="/"
                class="flex-1 flex items-center justify-center px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-tsb-four/50 text-sm font-semibold text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
            >
                {{ $t('orderCompleted.returnHome') }}
            </NuxtLinkLocale>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import {
    definePageMeta,
    ref,
    useAsyncData,
    useCartStore,
    useGqlSubscription,
    useNuxtApp,
    useRoute,
} from '#imports'
import type { Order } from '@/types'
import OrderStatusTimeline from '@/components/order/OrderStatusTimeline.vue'
import gql from 'graphql-tag'
import { print } from 'graphql'
import { useTracking } from '~/composables/useTracking'

definePageMeta({ public: false })

const route     = useRoute()
const cartStore = useCartStore()
const orderId   = route.params.orderId as string
const orderFailed = ref(false)
const { trackEvent } = useTracking()
const { $gqlFetch } = useNuxtApp()

const ORDER_QUERY = print(gql`
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
`)

// 1) Fetch the order once (SSR) — keyed by orderId to avoid stale data
const { data: dataOrder, error: orderError } = await useAsyncData<{ myOrder: Order }>(
    `order-${orderId}`,
    () => $gqlFetch<{ myOrder: Order }>(ORDER_QUERY, { variables: { orderId } }),
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
        title: t('orderCompleted.pageTitle'),
        robots: 'noindex,nofollow' // Order pages should not be indexed
    })
}, { immediate: true })

// 2) subscribe to updates on mount
let closeWs: () => void = () => {}

onMounted(() => {
    // Now destructure the `close` out of your updated composable
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

    // Store it
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
    // Only call if it's a real function
    if (typeof closeWs === 'function') {
        closeWs()
    }
})
</script>

<style scoped>
/* ── Bag entrance + perpetual float ── */
.oc-bag-wrapper {
    position: relative;
    animation: oc-bag-entrance 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.oc-bag-image {
    width: 160px;
    height: auto;
    animation: oc-bag-float 3.5s ease-in-out 1s infinite;
    filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.08));
}

@media (min-width: 640px) {
    .oc-bag-image {
        width: 200px;
    }
}

/* Shadow under the bag that breathes with the float */
.oc-bag-shadow {
    position: absolute;
    bottom: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 100px;
    height: 14px;
    background: radial-gradient(ellipse, rgba(0, 0, 0, 0.1) 0%, transparent 70%);
    border-radius: 50%;
    animation: oc-shadow-pulse 3.5s ease-in-out 1s infinite;
}

@media (min-width: 640px) {
    .oc-bag-shadow {
        width: 130px;
    }
}

/* ── Staggered fade-slide reveals ── */
.oc-stagger-1 { animation: oc-fade-up 0.5s ease-out 0.3s both; }
.oc-stagger-2 { animation: oc-fade-up 0.5s ease-out 0.45s both; }
.oc-stagger-3 { animation: oc-fade-up 0.5s ease-out 0.55s both; }
.oc-stagger-4 { animation: oc-fade-up 0.5s ease-out 0.65s both; }
.oc-stagger-5 { animation: oc-fade-up 0.5s ease-out 0.8s both; }

/* ── Falling cherry blossom petals ── */
.oc-petal {
    position: absolute;
    border-radius: 80% 0 55% 50% / 55% 0 80% 50%;
    opacity: 0;
}

/* Left-drifting petals */
.oc-petal-1  { width: 12px; height: 12px; background: #F2A9BD; top: -5%;  left: 10%;  animation: oc-petal-fall-left 5s ease-in-out 0s infinite; }
.oc-petal-2  { width: 9px;  height: 9px;  background: #FFEFEF; top: -8%;  left: 55%;  animation: oc-petal-fall-right 4.5s ease-in-out 0.8s infinite; }
.oc-petal-3  { width: 14px; height: 14px; background: #F2A9BD; top: -3%;  left: 80%;  animation: oc-petal-fall-left 5.5s ease-in-out 1.6s infinite; }
.oc-petal-4  { width: 8px;  height: 8px;  background: #fecdd3; top: -6%;  left: 30%;  animation: oc-petal-fall-right 4.8s ease-in-out 2.4s infinite; }
.oc-petal-5  { width: 10px; height: 10px; background: #FFEFEF; top: -4%;  left: 70%;  animation: oc-petal-fall-left 5.2s ease-in-out 3.2s infinite; }
.oc-petal-6  { width: 7px;  height: 7px;  background: #F2A9BD; top: -7%;  left: 45%;  animation: oc-petal-fall-right 4.6s ease-in-out 4s infinite; }
.oc-petal-7  { width: 11px; height: 11px; background: #fecdd3; top: -5%;  left: 20%;  animation: oc-petal-fall-right 5.3s ease-in-out 0.5s infinite; }
.oc-petal-8  { width: 8px;  height: 8px;  background: #F2A9BD; top: -9%;  left: 90%;  animation: oc-petal-fall-left 4.4s ease-in-out 1.2s infinite; }
.oc-petal-9  { width: 13px; height: 13px; background: #FFEFEF; top: -6%;  left: 5%;   animation: oc-petal-fall-right 5.8s ease-in-out 2s infinite; }
.oc-petal-10 { width: 6px;  height: 6px;  background: #fecdd3; top: -4%;  left: 62%;  animation: oc-petal-fall-left 4.2s ease-in-out 3.5s infinite; }
.oc-petal-11 { width: 10px; height: 10px; background: #F2A9BD; top: -8%;  left: 38%;  animation: oc-petal-fall-left 5s ease-in-out 1s infinite; }
.oc-petal-12 { width: 9px;  height: 9px;  background: #FFEFEF; top: -3%;  left: 85%;  animation: oc-petal-fall-right 4.7s ease-in-out 2.8s infinite; }

/* ── Keyframes ── */
@keyframes oc-bag-entrance {
    0% {
        opacity: 0;
        transform: translateY(60px) scale(0.92);
    }
    70% {
        opacity: 1;
        transform: translateY(-8px) scale(1.02);
    }
    100% {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@keyframes oc-bag-float {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-10px); }
}

@keyframes oc-shadow-pulse {
    0%, 100% { transform: translateX(-50%) scaleX(1);    opacity: 1; }
    50%      { transform: translateX(-50%) scaleX(0.82); opacity: 0.5; }
}

@keyframes oc-fade-up {
    0%   { opacity: 0; transform: translateY(16px); }
    100% { opacity: 1; transform: translateY(0); }
}

@keyframes oc-petal-fall-left {
    0% {
        opacity: 0;
        transform: translateY(0) translateX(0) rotate(0deg);
    }
    10% {
        opacity: 0.7;
    }
    50% {
        opacity: 0.5;
        transform: translateY(140px) translateX(-30px) rotate(200deg);
    }
    80% {
        opacity: 0.25;
    }
    100% {
        opacity: 0;
        transform: translateY(300px) translateX(-50px) rotate(400deg);
    }
}

@keyframes oc-petal-fall-right {
    0% {
        opacity: 0;
        transform: translateY(0) translateX(0) rotate(0deg);
    }
    10% {
        opacity: 0.7;
    }
    50% {
        opacity: 0.5;
        transform: translateY(130px) translateX(35px) rotate(-190deg);
    }
    80% {
        opacity: 0.25;
    }
    100% {
        opacity: 0;
        transform: translateY(300px) translateX(55px) rotate(-380deg);
    }
}
</style>
