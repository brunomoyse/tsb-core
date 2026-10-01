<script lang="ts" setup>
import { computed, ref, watch } from "vue"
import type { Order } from "#engine/types"
import { formatAddress } from "#engine/utils/utils"
import { formatDateTime } from "#engine/utils/datetime"
import { formatPrice } from "#engine/lib/price"
import gql from 'graphql-tag'

const { showProductCode = false } = useAppConfig().brand
import { orderItemLabelParts } from "#engine/utils/orderItemLabel"
import { print } from "graphql/index"
import { useGqlQuery } from "#imports"
import { useI18n } from "vue-i18n"
import { useInvoiceDownload } from "#engine/composables/useInvoiceDownload"
import { useNotificationsStore } from "#engine/stores/notifications"
import { useOrderTracking } from "#engine/composables/useOrderTracking"
import { useReorder } from "#engine/composables/useReorder"



definePageMeta({ public: false })

const notifications = useNotificationsStore()
const { t, locale } = useI18n()
const { downloadInvoice } = useInvoiceDownload()
const { reorder } = useReorder()

const dateLocaleMap: Record<string, string> = { fr: 'fr-BE', en: 'en-GB', zh: 'zh-CN', nl: 'nl-BE' }
const dateLocale = computed(() => dateLocaleMap[locale.value] || 'fr-BE')

useSeoMeta({
    title: t('schema.myOrders.title'),
    robots: 'noindex,nofollow',
})

const MY_ORDERS = gql`
  {
    myOrders(first: 100) {
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
      cancellationReason
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
          id name code slug price pieceCount isAvailable isDiscountable isHalal isLunchOnly isSpicy isVegetarian isVisible
          category { id name order }
          choices { id productId priceModifier sortOrder name }
        }
        choice { id productId priceModifier sortOrder name }
      }
    }
  }
`

const LOAD_STEP = 5
const visibleCount = ref(10)

const { data: dataOrders, error: ordersError, refetch: refetchOrders } = await useGqlQuery<{ myOrders: Order[] }>(print(MY_ORDERS), {}, { server: false })
// Stays null until loaded (loading state instead of a flash of "no orders"); a failed load shows the empty state.
const orders = computed<Order[] | null>(() => dataOrders.value?.myOrders ?? (ordersError.value ? [] : null))

interface OrderItemLike {
    product: { code: string | null; name: string; category?: { name: string } | null }
    choice?: { name: string } | null
}

const orderItemSegments = (item: OrderItemLike): { text: string; muted: boolean }[] => {
    const parts = orderItemLabelParts({
        code: item.product.code,
        categoryName: item.product.category?.name,
        productName: item.product.name,
    })
    const segments: { text: string; muted: boolean }[] = []
    if (showProductCode && parts.code) segments.push({ text: parts.code, muted: true })
    if (parts.category) segments.push({ text: parts.category, muted: true })
    segments.push({ text: parts.name, muted: false })
    return segments
}

const orderItemChoice = (item: OrderItemLike): string | undefined =>
    orderItemLabelParts({
        code: item.product.code,
        categoryName: item.product.category?.name,
        productName: item.product.name,
        choiceName: item.choice?.name,
    }).choice

// The query is client-only, so the error only appears after setup — watch it instead of checking once.
watch(ordersError, (err) => {
    if (!err) return
    notifications.notify({
        message: t('notify.errors.ordersLoadFailed'),
        persistent: false,
        duration: 5000,
        variant: 'error',
    })
}, { immediate: true })

/* Live tracking (subscriptions, reconnect refetch, polling fallback, ?followOrder)
   is driven by watchers over the loaded orders: the query is client-only, so the
   list is still empty at setup/onMounted on a hard load. */
const {
    trackedOrders,
    getTrackedOrder,
    toggleOrder,
    isExpanded,
    getStatus,
    isOrderCompleted,
} = useOrderTracking({
    orders,
    refetch: refetchOrders,
    // A followed order beyond the first page must be rendered before it is expanded/scrolled to.
    revealOrder: (index) => { if (index >= visibleCount.value) visibleCount.value = index + 1 },
})

const visibleOrders = computed(() => (trackedOrders.value ?? []).slice(0, visibleCount.value))
const remainingCount = computed(() => (orders.value?.length ?? 0) - visibleCount.value)
const hasMore = computed(() => remainingCount.value > 0)
const nextBatchCount = computed(() => Math.min(LOAD_STEP, remainingCount.value))

const loadMore = () => {
    visibleCount.value += LOAD_STEP
}

// Accordion transition hooks (JS-driven for smooth height animation)
const accordionBeforeEnter = (el: Element) => {
    const htmlEl = el as HTMLElement
    htmlEl.style.height = '0'
    htmlEl.style.overflow = 'hidden'
    htmlEl.style.opacity = '0'
}

const accordionEnter = (el: Element, done: () => void) => {
    const htmlEl = el as HTMLElement
    htmlEl.style.transition = 'height 300ms ease-out, opacity 300ms ease-out'
    htmlEl.style.height = `${htmlEl.scrollHeight}px`
    htmlEl.style.opacity = '1'
    htmlEl.addEventListener('transitionend', done, { once: true })
}

const accordionAfterEnter = (el: Element) => {
    const htmlEl = el as HTMLElement
    htmlEl.style.height = ''
    htmlEl.style.overflow = ''
    htmlEl.style.transition = ''
    htmlEl.style.opacity = ''
}

const accordionBeforeLeave = (el: Element) => {
    const htmlEl = el as HTMLElement
    htmlEl.style.height = `${htmlEl.scrollHeight}px`
    htmlEl.style.overflow = 'hidden'
}

const accordionLeave = (el: Element, done: () => void) => {
    const htmlEl = el as HTMLElement
    // Force reflow so the browser registers the starting height
    void htmlEl.offsetHeight
    htmlEl.style.transition = 'height 250ms ease-in, opacity 200ms ease-in'
    htmlEl.style.height = '0'
    htmlEl.style.opacity = '0'
    htmlEl.addEventListener('transitionend', done, { once: true })
}

const accordionAfterLeave = (el: Element) => {
    const htmlEl = el as HTMLElement
    htmlEl.style.height = ''
    htmlEl.style.overflow = ''
    htmlEl.style.transition = ''
    htmlEl.style.opacity = ''
}

const getStatusColorClass = (status: string) => {
    const map: Record<string,string> = {
        DELIVERED: 'bg-green-50 text-green-700',
        PICKED_UP:  'bg-green-50 text-green-700',
        CANCELLED: 'bg-primary-50 text-primary-600',
        FAILED:    'bg-primary-50 text-primary-600'
    }
    return map[status] || 'bg-neutral-100 text-neutral-600'
}
</script>

<template>
    <section class="max-w-5xl mx-auto pt-6 sm:pt-8 pb-8 px-4 sm:px-6">
        <!-- Back link + Header -->
        <div class="mb-6 sm:mb-8 bento-cell" style="--delay: 0">
            <NuxtLinkLocale
                to="/me"
                class="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm text-neutral-500 hover:text-primary-500 transition mb-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
                </svg>
                {{ $t('me.orders.backToAccount') }}
            </NuxtLinkLocale>
            <PageTitle>
                {{ $t('me.orders.allOrdersTitle') }}
            </PageTitle>
        </div>

        <!-- Loading State -->
        <div v-if="orders === null" class="bento-cell" style="--delay: 1">
            <div class="bg-tsb-two rounded-2xl p-8 text-center text-neutral-500 text-sm">
                {{ $t('me.orders.loading') }}
            </div>
        </div>

        <!-- Orders List -->
        <div v-else-if="orders?.length" class="space-y-3">
            <div
                v-for="(order, idx) in visibleOrders"
                :id="`order-card-${order.id}`"
                :key="order.id"
                class="bg-tsb-two rounded-2xl transition-all bento-cell"
                :style="{ '--delay': idx + 1 }"
            >
                <!-- Order Header -->
                <button
                    type="button"
                    :aria-expanded="isExpanded(order.id)"
                    :aria-controls="`order-panel-${order.id}`"
                    :aria-label="$t('me.orders.toggleOrder')"
                    class="w-full min-h-11 text-left p-5 sm:p-6 cursor-pointer hover:bg-tsb-two/80 rounded-2xl flex items-center justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
                    @click="toggleOrder(order.id)"
                >
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <h3 class="font-semibold text-neutral-700 text-sm whitespace-nowrap">
                                {{ $t(`cart.${order.type.toLowerCase()}`) }}
                            </h3>
                            <span
                                class="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0"
                                :class="isOrderCompleted(order.status) ? getStatusColorClass(order.status) : 'text-primary-600 bg-tsb-four'"
                            >
                                {{ getStatus(getTrackedOrder(order).status) }}
                            </span>
                        </div>
                        <p class="mt-0.5 text-xs text-neutral-400 tabular-nums">
                            {{ formatDateTime(order.createdAt, dateLocale.value) }}
                        </p>
                    </div>
                    <div class="flex items-center gap-2 ml-3 shrink-0">
                        <span class="text-sm font-semibold text-neutral-700 tabular-nums whitespace-nowrap">
                            {{ formatPrice(order.totalPrice) }}
                        </span>
                        <span
                            :class="{ 'rotate-180': isExpanded(order.id) }"
                            class="text-neutral-400 transition-transform duration-200 flex-shrink-0"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M19 9l-7 7-7-7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                            </svg>
                        </span>
                    </div>
                </button>

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
                    <div :id="`order-panel-${order.id}`" v-show="isExpanded(order.id)" class="px-5 sm:px-6 pb-5 sm:pb-6">

                        <!-- Inline Timeline (for in-progress orders) -->
                        <div v-if="!isOrderCompleted(order.status)" class="mb-4">
                            <OrderStatusTimeline :order="getTrackedOrder(order)" />
                        </div>

                        <!-- Cancellation reason -->
                        <div
                            v-if="order.status === 'CANCELLED' && order.cancellationReason && order.cancellationReason !== 'OTHER'"
                            class="mb-3 p-3 bg-primary-50/70 rounded-xl"
                        >
                            <span class="text-[11px] text-red-500 uppercase tracking-wider">{{ $t('orderCompleted.cancellationReasonLabel') }}</span>
                            <p class="mt-0.5 text-sm text-red-700">{{ $t(`orderCompleted.cancellationReasons.${order.cancellationReason}`) }}</p>
                        </div>

                        <!-- Delivery Address -->
                        <div v-if="order.address" class="mb-3 p-3 bg-white/60 rounded-xl">
                            <span class="text-[11px] text-neutral-500 uppercase tracking-wider">{{ $t('checkout.deliveryAddress') }}</span>
                            <p class="mt-0.5 text-sm text-neutral-700 whitespace-pre-line">{{ formatAddress(order.address) }}</p>
                        </div>

                        <!-- Order Items -->
                        <div class="space-y-1.5">
                            <div
                                v-for="(item, itemIdx) in order.items"
                                :key="itemIdx"
                                class="flex items-center justify-between py-2 px-3 rounded-lg bg-white/60"
                            >
                                <p class="text-sm text-neutral-800">
                                    <template v-for="(part, i) in orderItemSegments(item)" :key="i">
                                        <span v-if="i > 0" class="text-neutral-400 mx-1">·</span>
                                        <span :class="part.muted ? 'text-neutral-400' : ''">{{ part.text }}</span>
                                    </template>
                                    <span v-if="orderItemChoice(item)" class="text-neutral-400 ml-1">({{ orderItemChoice(item) }})</span>
                                </p>
                                <div class="flex items-center gap-2 ml-3 flex-shrink-0">
                                    <span class="text-xs font-medium text-neutral-500 tabular-nums">x{{ item.quantity }}</span>
                                    <span class="text-xs text-neutral-400 tabular-nums">{{ formatPrice(item.totalPrice) }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Order Footer -->
                        <div class="mt-4 pt-3 border-t border-neutral-200/60 flex items-center justify-between">
                            <span class="text-xs text-neutral-500">{{ $t('me.orders.total') }}</span>
                            <span class="text-sm font-semibold text-neutral-900 tabular-nums">
                                {{ formatPrice(order.totalPrice) }}
                            </span>
                        </div>

                        <!-- Re-order Button -->
                        <UiButton
                            v-if="['DELIVERED', 'PICKED_UP'].includes(order.status)"
                            block
                            class="mt-3"
                            @click="reorder(order)"
                        >
                            {{ $t('reorder.button') }}
                        </UiButton>

                        <!-- Download Invoice Button -->
                        <button
                            v-if="['DELIVERED', 'PICKED_UP'].includes(order.status)"
                            type="button"
                            class="mt-2 w-full min-h-11 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-tsb-four/40 focus:outline-none focus:ring-2 focus:ring-primary-300"
                            @click.stop="downloadInvoice(order.id)"
                        >
                            {{ $t('me.orders.downloadInvoice') }}
                        </button>
                    </div>
                </transition>
            </div>

            <!-- Load more -->
            <button
                v-if="hasMore"
                type="button"
                class="load-more-btn group mt-2 w-full min-h-11 rounded-2xl border border-dashed border-neutral-300 hover:border-primary-300 bg-tsb-two/60 hover:bg-tsb-four/50 py-4 flex items-center justify-center gap-2.5 transition-all duration-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
                @click="loadMore"
            >
                <span class="text-sm font-medium text-neutral-400 group-hover:text-primary-500 transition-colors duration-300">
                    {{ remainingCount <= LOAD_STEP
                        ? $t('me.orders.loadMoreLast', { count: remainingCount })
                        : $t('me.orders.loadMore', { count: nextBatchCount })
                    }}
                </span>
                <svg
                    class="w-4 h-4 text-neutral-300 group-hover:text-primary-400 transition-all duration-300 group-hover:translate-y-0.5"
                    fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
                </svg>
            </button>
        </div>

        <!-- Empty State -->
        <div v-else class="bento-cell" style="--delay: 1">
            <div class="bg-tsb-two rounded-2xl py-12 text-center">
                <div class="w-14 h-14 rounded-full bg-white flex items-center justify-center mx-auto mb-4">
                    <svg class="w-7 h-7 text-neutral-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>
                    </svg>
                </div>
                <p class="text-sm text-neutral-500">{{ $t('me.orders.empty') }}</p>
                <!-- Subtle chopsticks decoration -->
                <div class="flex justify-center mt-3" aria-hidden="true">
                    <svg class="w-8 h-6 text-neutral-300/50" viewBox="0 0 40 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                        <line x1="12" y1="2" x2="16" y2="22"/>
                        <line x1="28" y1="2" x2="24" y2="22"/>
                    </svg>
                </div>
            </div>
        </div>

    </section>
</template>

<style scoped>
.rotate-180 {
    transform: rotate(180deg);
}

/* Staggered entrance */
.bento-cell {
    animation: bento-enter 0.5s ease-out both;
    animation-delay: calc(var(--delay, 0) * 80ms);
}

@keyframes bento-enter {
    from {
        opacity: 0;
        transform: translateY(16px) scale(0.97);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@media (prefers-reduced-motion: reduce) {
    .bento-cell {
        animation: none;
    }
}
</style>
