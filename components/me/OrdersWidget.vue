<template>
    <article class="bg-tsb-two rounded-2xl p-6 shadow-sm">
        <div class="border-b border-gray-100 pb-4">
            <h2 class="text-lg font-semibold text-gray-900">{{ $t('me.orders.title') }}</h2>
        </div>

        <!-- Loading State -->
        <div v-if="orders === null" class="mt-6 text-center text-gray-500">
            {{ $t('me.orders.loading') }}
        </div>

        <!-- Orders List -->
        <div v-else-if="orders?.length" class="mt-4 space-y-2">
            <div
                v-for="order in orders"
                :key="order.id"
                class="bg-white rounded-xl border border-gray-100 transition-all"
            >
                <!-- Order Header -->
                <div
                    class="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                    @click="toggleOrder(order.id)"
                >
                    <div>
                        <h3 class="font-semibold text-gray-700">
                            {{ $t(`cart.${order.type.toLowerCase()}`) }}
                        </h3>
                        <p class="mt-1 text-sm text-gray-500">
                            {{
                                new Date(order.createdAt).toLocaleString("fr-BE", {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })
                            }}
                        </p>
                    </div>
                    <div class="flex items-center gap-2">
                        <!-- Order Status -->
                        <span
                            v-if="isOrderCompleted(order.status)"
                            class="inline-block px-3 py-1 rounded-full text-sm font-medium text-white"
                            :class="getStatusColorClass(order.status)"
                        >
                          {{ getStatus(order.status) }}
                        </span>
                        <!-- Follow Button -->
                        <button
                            v-else
                            @click.stop="openTimeline(order)"
                            class="inline-block px-3 py-1 rounded-full text-sm font-medium text-black bg-gray-100 hover:bg-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                        >
                            {{ $t('me.orders.follow') }}
                        </button>
                        <span
                            :class="{ 'rotate-180': isExpanded(order.id) }"
                            class="text-gray-400 transition-transform duration-200"
                        >
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                d="M19 9l-7 7-7-7"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                            />
                          </svg>
                        </span>
                    </div>
                </div>

                <!-- Accordion Content -->
                <transition
                    enter-active-class="transition-all duration-300 ease-out"
                    enter-from-class="max-h-0 opacity-0"
                    enter-to-class="max-h-[1000px] opacity-100"
                    leave-active-class="transition-all duration-200 ease-in"
                    leave-from-class="max-h-[1000px] opacity-100"
                    leave-to-class="max-h-0 opacity-0"
                >
                    <div v-show="isExpanded(order.id)" class="px-4 pb-4">
                        <!-- Delivery Address Section -->
                        <div
                            v-if="order.address"
                            class="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                        >
                            <h4 class="text-sm font-semibold text-gray-700">
                                {{ $t('checkout.deliveryAddress', 'Delivery Address') }}
                            </h4>
                            <p class="mt-1 text-sm text-gray-600">
                                {{ formatAddress(order.address) }}
                            </p>
                        </div>

                        <!-- Order Items Section -->
                        <div class="space-y-4">
                            <div class="space-y-3">
                                <div
                                    v-for="(item, index) in order.items"
                                    :key="index"
                                    class="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                                >
                                    <div>
                                        <p class="text-sm font-medium text-gray-900">
                                            {{ item.product.code ? item.product.code + ' - ' : '' }}
                                            {{ item.product.category.name + ' - ' + item.product.name }}
                                        </p>
                                    </div>
                                    <span class="text-sm font-medium text-gray-700">
                                        x{{ item.quantity }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Order Footer -->
                        <div class="mt-6 border-t border-gray-100 pt-4">
                            <div class="flex items-center justify-between">
                                <span class="text-sm text-gray-500">
                                  {{ $t('me.orders.total') }}
                                </span>
                                <span class="font-medium text-gray-900">
                                    {{
                                        new Intl.NumberFormat("fr-BE", {
                                            style: "currency",
                                            currency: "EUR",
                                        }).format(parseFloat(order.totalPrice))
                                    }}
                                </span>
                            </div>
                        </div>

                        <!-- Re-order Button -->
                        <button
                            v-if="['DELIVERED', 'PICKED_UP'].includes(order.status)"
                            class="mt-4 w-full rounded-lg bg-red-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
                            @click="reorder(order)"
                        >
                            {{ $t('reorder.button') }}
                        </button>
                    </div>
                </transition>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else class="mt-6 text-center text-gray-500">
            {{ $t('me.orders.empty') }}
        </div>

        <!-- Modal for Order Status Timeline -->
        <transition name="fade">
            <div
                v-if="activeOrder"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            >
                <div class="bg-white rounded-lg p-6 relative dark:bg-gray-800">
                    <button
                        @click="closeTimeline"
                        class="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
                    >
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                    <!-- Order Status Timeline Component -->
                    <OrderStatusTimeline
                        :order="activeOrder"
                    />
                </div>
            </div>
        </transition>
    </article>
</template>

<script lang="ts" setup>
import { useGqlQuery, useGqlSubscription } from "#imports"
import { ref, computed, watch, onUnmounted, onMounted } from "vue"
import { useI18n } from "vue-i18n"
import { formatAddress } from "~/utils/utils"
import { useReorder } from "~/composables/useReorder"
import OrderStatusTimeline from "~/components/order/OrderStatusTimeline.vue"
import gql from 'graphql-tag'
import { print } from "graphql/index"
import type { Order } from "~/types"

const { t } = useI18n()
const { reorder } = useReorder()

// GraphQL query for initial orders
const MY_ORDERS = gql`
  {
    myOrders {
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
        houseNumber
        boxNumber
        postcode
      }
      customer {
        id
        firstName
        lastName
      }
      payment { status }
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
`

// Fetch orders
const { data: dataOrders } = await useGqlQuery<{ myOrders: Order[] }>(print(MY_ORDERS))
const orders = computed(() => dataOrders.value?.myOrders ?? [])

// Track expanded items and the single active order (for details/timeline)
const expandedOrders = ref(new Set<string>())
const activeOrder = ref<Order | null>(null)

// Subscription cleanup handle
let unsubscribe = () => {}

// Start/stop subscription whenever activeOrder changes
watch(activeOrder, (order) => {
    // tear down previous subscription
    if (typeof unsubscribe === 'function') {
        unsubscribe()
        unsubscribe = () => {}
    }

    if (order) {
        // subscribe to updates for this order
        const SUB_ORDER_UPDATES = gql`
      subscription ($orderId: ID!) {
        myOrderUpdated(orderId: $orderId) {
          id
          status
          updatedAt
          estimatedReadyTime
          payment { status }
        }
      }
    `
        const { data: liveUpdate, close } = useGqlSubscription<{ myOrderUpdated: Partial<Order> }>(
            print(SUB_ORDER_UPDATES), { orderId: order.id }
        )

        unsubscribe = close

        // merge incoming changes into activeOrder
        watch(liveUpdate, (val) => {
            if (val?.myOrderUpdated && activeOrder.value) {
                activeOrder.value = {
                    ...activeOrder.value,
                    ...val.myOrderUpdated
                }
            }
        })
    }
}, { immediate: true })

// Cleanup
onUnmounted(() => {
    if (typeof unsubscribe === 'function') unsubscribe()
})

// UI methods
function toggleOrder(orderId: string) {
    if (expandedOrders.value.has(orderId)) {
        expandedOrders.value.delete(orderId)
        activeOrder.value = null
    } else {
        expandedOrders.value.add(orderId)
        const order = orders.value.find(o => o.id === orderId) ?? null
        activeOrder.value = order
    }
}

function openTimeline(order: Order) {
    activeOrder.value = order
    expandedOrders.value.add(order.id)
}

function closeTimeline() {
    activeOrder.value = null
}

const isExpanded = (orderId: string) => expandedOrders.value.has(orderId)
const isOrderCompleted = (status: string) => ['DELIVERED','PICKED_UP','CANCELLED','FAILED'].includes(status)

function getStatus(status: string) {
    switch (status) {
        case 'PICKED_UP': return t('me.orders.status.pickedUp')
        case 'DELIVERED': return t('me.orders.status.delivered')
        case 'CANCELLED': return t('me.orders.status.cancelled')
        case 'FAILED': return t('me.orders.status.failed')
        default: return ''
    }
}

function getStatusColorClass(status: string) {
    const map: Record<string,string> = {
        DELIVERED: 'bg-green-500',
        PICKED_UP:  'bg-green-500',
        CANCELLED: 'bg-red-500',
        FAILED:    'bg-red-500'
    }
    return map[status] || 'bg-gray-400'
}

// Handle `?followOrder=...` on mount
onMounted(() => {
    const params = new URLSearchParams(window.location.search)
    const followId = params.get('followOrder')
    if (followId) {
        const order = orders.value.find(o => o.id === followId)
        if (order) openTimeline(order)
    }
})
</script>

<style>
.rotate-180 {
    transform: rotate(180deg);
}

/* Fade transition for the modal */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
