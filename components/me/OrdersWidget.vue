<template>
    <article class="bg-tsb-two rounded-2xl p-6 sm:p-7">
        <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-gray-900 text-[15px] flex items-center gap-2">
                <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                    <svg class="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>
                    </svg>
                </div>
                {{ $t('me.orders.recentTitle') }}
            </h2>
            <NuxtLinkLocale
                to="/me/orders"
                class="text-xs font-medium text-gray-500 hover:text-red-500 transition inline-flex items-center gap-1 group"
            >
                {{ $t('me.orders.viewAll') }}
                <svg class="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
            </NuxtLinkLocale>
        </div>

        <!-- Loading State -->
        <div v-if="orders === null" class="mt-6 text-center text-gray-500 text-sm">
            {{ $t('me.orders.loading') }}
        </div>

        <!-- Orders List (limited) -->
        <div v-else-if="orders?.length" class="space-y-2">
            <div
                v-for="order in visibleOrders"
                :key="order.id"
                class="bg-white rounded-xl transition-all"
            >
                <!-- Order Header -->
                <div
                    class="p-4 cursor-pointer hover:bg-gray-50/80 rounded-xl flex items-center justify-between"
                    @click="toggleOrder(order.id)"
                >
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <h3 class="font-semibold text-gray-700 text-sm">
                                {{ $t(`cart.${order.type.toLowerCase()}`) }}
                            </h3>
                            <span
                                v-if="isOrderCompleted(order.status)"
                                class="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                                :class="getStatusColorClass(order.status)"
                            >
                                {{ getStatus(order.status) }}
                            </span>
                        </div>
                        <p class="mt-0.5 text-xs text-gray-400 tabular-nums">
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
                        <!-- Compact progress bar preview for in-progress orders (hidden when expanded) -->
                        <div v-if="!isOrderCompleted(order.status) && !isExpanded(order.id)" class="mt-2">
                            <OrderStatusTimeline :order="getTrackedOrder(order)" compact />
                        </div>
                    </div>
                    <div class="flex items-center gap-2 ml-3">
                        <!-- Current status badge (in-progress orders) -->
                        <span
                            v-if="!isOrderCompleted(order.status)"
                            class="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium text-red-600 bg-tsb-four"
                        >
                            {{ getStatus(getTrackedOrder(order).status) }}
                        </span>
                        <span
                            :class="{ 'rotate-180': isExpanded(order.id) }"
                            class="text-gray-400 transition-transform duration-200 flex-shrink-0"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M19 9l-7 7-7-7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                            </svg>
                        </span>
                    </div>
                </div>

                <!-- Accordion Content -->
                <transition
                    :css="false"
                    @before-enter="accordionBeforeEnter"
                    @enter="accordionEnter"
                    @after-enter="accordionAfterEnter"
                    @before-leave="accordionBeforeLeave"
                    @leave="accordionLeave"
                    @after-leave="accordionAfterLeave"
                >
                    <div v-show="isExpanded(order.id)" class="px-4 pb-4">

                        <!-- Inline Timeline (for in-progress orders) -->
                        <div v-if="!isOrderCompleted(order.status)" class="mb-4">
                            <OrderStatusTimeline :order="getTrackedOrder(order)" />
                        </div>

                        <!-- Delivery Address -->
                        <div v-if="order.address" class="mb-3 p-3 bg-gray-50/80 rounded-xl">
                            <span class="text-[11px] text-gray-500 uppercase tracking-wider">{{ $t('checkout.deliveryAddress', 'Delivery Address') }}</span>
                            <p class="mt-0.5 text-sm text-gray-700">{{ formatAddress(order.address) }}</p>
                        </div>

                        <!-- Order Items -->
                        <div class="space-y-1.5">
                            <div
                                v-for="(item, idx) in order.items"
                                :key="idx"
                                class="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50/60"
                            >
                                <p class="text-sm text-gray-800">
                                    <span v-if="item.product.code" class="text-gray-400">{{ item.product.code }} — </span>
                                    <span v-if="item.product.category?.name" class="text-gray-400">{{ item.product.category.name }} — </span>
                                    {{ item.product.name }}
                                </p>
                                <div class="flex items-center gap-2 ml-3 flex-shrink-0">
                                    <span class="text-xs font-medium text-gray-500 tabular-nums">x{{ item.quantity }}</span>
                                    <span class="text-xs text-gray-400 tabular-nums">{{ new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(parseFloat(item.totalPrice)) }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Order Footer -->
                        <div class="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                            <span class="text-xs text-gray-500">{{ $t('me.orders.total') }}</span>
                            <span class="text-sm font-semibold text-gray-900 tabular-nums">
                                {{ new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(parseFloat(order.totalPrice)) }}
                            </span>
                        </div>

                        <!-- Re-order Button -->
                        <button
                            v-if="['DELIVERED', 'PICKED_UP'].includes(order.status)"
                            class="mt-3 w-full rounded-xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
                            @click="reorder(order)"
                        >
                            {{ $t('reorder.button') }}
                        </button>
                    </div>
                </transition>
            </div>

            <!-- Load more -->
            <button
                v-if="hasMore"
                class="load-more-btn group mt-1 w-full rounded-xl border border-dashed border-gray-300 hover:border-red-300 bg-white/40 hover:bg-tsb-four/50 py-3 flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer"
                @click="loadMore"
            >
                <span class="text-xs font-medium text-gray-400 group-hover:text-red-500 transition-colors duration-300">
                    {{ remainingCount <= LOAD_STEP
                        ? $t('me.orders.loadMoreLast', { count: remainingCount })
                        : $t('me.orders.loadMore', { count: nextBatchCount })
                    }}
                </span>
                <svg
                    class="w-3.5 h-3.5 text-gray-300 group-hover:text-red-400 transition-all duration-300 group-hover:translate-y-0.5"
                    fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
                </svg>
            </button>
        </div>

        <!-- Empty State -->
        <div v-else class="py-8 text-center">
            <div class="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto mb-3">
                <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>
                </svg>
            </div>
            <p class="text-sm text-gray-500">{{ $t('me.orders.empty') }}</p>
        </div>
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

const LOAD_STEP = 5
const visibleCount = ref(LOAD_STEP)

const MY_ORDERS = gql`
  {
    myOrders(first: 50) {
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

const { data: dataOrders } = await useGqlQuery<{ myOrders: Order[] }>(print(MY_ORDERS))
const orders = computed(() => dataOrders.value?.myOrders ?? [])
const visibleOrders = computed(() => orders.value.slice(0, visibleCount.value))
const remainingCount = computed(() => orders.value.length - visibleCount.value)
const hasMore = computed(() => remainingCount.value > 0)
const nextBatchCount = computed(() => Math.min(LOAD_STEP, remainingCount.value))

function loadMore() {
    visibleCount.value += LOAD_STEP
}

const expandedOrders = ref(new Set<string>())
const activeOrder = ref<Order | null>(null)

// Live updates map — tracks subscribed orders with merged data
const liveOrderData = ref<Record<string, Partial<Order>>>({})

let unsubscribe = () => {}

watch(activeOrder, (order) => {
    if (typeof unsubscribe === 'function') {
        unsubscribe()
        unsubscribe = () => {}
    }

    if (order) {
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

        watch(liveUpdate, (val) => {
            if (val?.myOrderUpdated) {
                liveOrderData.value[order.id] = {
                    ...liveOrderData.value[order.id],
                    ...val.myOrderUpdated
                }
            }
        })
    }
}, { immediate: true })

onUnmounted(() => {
    if (typeof unsubscribe === 'function') unsubscribe()
})

// Returns the order with any live-merged data
function getTrackedOrder(order: Order): Order {
    const live = liveOrderData.value[order.id]
    return live ? { ...order, ...live } as Order : order
}

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

const isExpanded = (orderId: string) => expandedOrders.value.has(orderId)
const isOrderCompleted = (status: string) => ['DELIVERED','PICKED_UP','CANCELLED','FAILED'].includes(status)

function getStatus(status: string) {
    const map: Record<string, string> = {
        PENDING: t('me.orders.status.pending'),
        CONFIRMED: t('me.orders.status.confirmed'),
        PREPARING: t('me.orders.status.preparing'),
        AWAITING_PICK_UP: t('me.orders.status.awaitingPickup'),
        OUT_FOR_DELIVERY: t('me.orders.status.outForDelivery'),
        PICKED_UP: t('me.orders.status.pickedUp'),
        DELIVERED: t('me.orders.status.delivered'),
        CANCELLED: t('me.orders.status.cancelled'),
        FAILED: t('me.orders.status.failed'),
    }
    return map[status] || ''
}

// Accordion transition hooks (JS-driven for smooth height animation)
function accordionBeforeEnter(el: Element) {
    const htmlEl = el as HTMLElement
    htmlEl.style.height = '0'
    htmlEl.style.overflow = 'hidden'
    htmlEl.style.opacity = '0'
}

function accordionEnter(el: Element, done: () => void) {
    const htmlEl = el as HTMLElement
    htmlEl.style.transition = 'height 300ms ease-out, opacity 300ms ease-out'
    htmlEl.style.height = htmlEl.scrollHeight + 'px'
    htmlEl.style.opacity = '1'
    htmlEl.addEventListener('transitionend', done, { once: true })
}

function accordionAfterEnter(el: Element) {
    const htmlEl = el as HTMLElement
    htmlEl.style.height = ''
    htmlEl.style.overflow = ''
    htmlEl.style.transition = ''
    htmlEl.style.opacity = ''
}

function accordionBeforeLeave(el: Element) {
    const htmlEl = el as HTMLElement
    htmlEl.style.height = htmlEl.scrollHeight + 'px'
    htmlEl.style.overflow = 'hidden'
}

function accordionLeave(el: Element, done: () => void) {
    const htmlEl = el as HTMLElement
    // Force reflow so the browser registers the starting height
    htmlEl.offsetHeight
    htmlEl.style.transition = 'height 250ms ease-in, opacity 200ms ease-in'
    htmlEl.style.height = '0'
    htmlEl.style.opacity = '0'
    htmlEl.addEventListener('transitionend', done, { once: true })
}

function accordionAfterLeave(el: Element) {
    const htmlEl = el as HTMLElement
    htmlEl.style.height = ''
    htmlEl.style.overflow = ''
    htmlEl.style.transition = ''
    htmlEl.style.opacity = ''
}

function getStatusColorClass(status: string) {
    const map: Record<string,string> = {
        DELIVERED: 'bg-green-50 text-green-700',
        PICKED_UP:  'bg-green-50 text-green-700',
        CANCELLED: 'bg-red-50 text-red-600',
        FAILED:    'bg-red-50 text-red-600'
    }
    return map[status] || 'bg-gray-100 text-gray-600'
}

onMounted(() => {
    const params = new URLSearchParams(window.location.search)
    const followId = params.get('followOrder')
    if (followId) {
        const order = orders.value.find(o => o.id === followId)
        if (order) {
            expandedOrders.value.add(order.id)
            activeOrder.value = order
        }
    }
})
</script>

<style scoped>
.rotate-180 {
    transform: rotate(180deg);
}
</style>
