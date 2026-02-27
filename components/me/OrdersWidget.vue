<template>
    <article class="bg-tsb-two rounded-2xl overflow-hidden">

        <!-- ── Header ── -->
        <div class="px-6 pt-6 sm:px-7 sm:pt-7">
            <div class="relative overflow-hidden flex items-center justify-between">
                <h2 class="font-semibold text-gray-900 text-[15px] flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                        <svg class="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                        </svg>
                    </div>
                    {{ $t('me.orders.recentTitle') }}
                </h2>
                <!-- Kanji watermark -->
                <span class="absolute bottom-0 right-2 text-8xl leading-none pointer-events-none select-none text-red-500/[0.04]"
                      style="font-family: 'Hiragino Mincho ProN', 'Yu Mincho', 'MS PMincho', serif"
                      aria-hidden="true">注文</span>
                <NuxtLinkLocale
                    to="/me/orders"
                    class="text-xs font-medium text-gray-500 hover:text-red-500 transition inline-flex items-center gap-1 group"
                >
                    {{ $t('me.orders.viewAll') }}
                    <svg class="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                </NuxtLinkLocale>
            </div>

            <!-- Nami (wave) separator -->
            <svg class="w-full h-[6px] mt-4" viewBox="0 0 200 8" preserveAspectRatio="none" fill="none">
                <path
                    d="M0 4 Q12.5 0 25 4 Q37.5 8 50 4 Q62.5 0 75 4 Q87.5 8 100 4 Q112.5 0 125 4 Q137.5 8 150 4 Q162.5 0 175 4 Q187.5 8 200 4"
                    stroke="currentColor" stroke-width="0.8" class="text-gray-400/30"
                />
            </svg>
        </div>

        <!-- ── Content ── -->
        <div class="px-6 pb-6 sm:px-7 sm:pb-7">

            <!-- Loading shimmer -->
            <div v-if="orders === null" class="space-y-3 pt-3">
                <div v-for="i in 3" :key="i" class="h-[68px] rounded-xl bg-white/50 animate-shimmer" style="background-size: 200% 100%; background-image: linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.6) 50%, transparent 75%)" />
            </div>

            <template v-else-if="orders.length">

                <!-- ━━ Active Orders ━━ -->
                <div v-if="activeOrders.length" class="pt-3 space-y-3">
                    <div
                        v-for="order in activeOrders"
                        :key="order.id"
                        class="active-card relative bg-white rounded-xl border-l-[3px] border-l-red-400"
                    >
                        <!-- Card header -->
                        <button
                            type="button"
                            :aria-expanded="isExpanded(order.id)"
                            :aria-label="$t('me.orders.toggleOrder')"
                            class="relative z-[1] w-full text-left p-4 cursor-pointer hover:bg-gray-50/50 rounded-xl flex items-center gap-3 transition-colors"
                            @click="toggleOrder(order.id)"
                        >
                            <!-- Type icon -->
                            <div class="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                                <!-- Moped icon for delivery (Tabler Icons) -->
                                <svg v-if="order.type === 'DELIVERY'" class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                                    <path d="M16 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
                                    <path d="M5 16v1a2 2 0 0 0 4 0v-5h-3a3 3 0 0 0 -3 3v1h10a6 6 0 0 1 5 -4v-5a2 2 0 0 0 -2 -2h-1" />
                                    <path d="M6 9l3 0" />
                                </svg>
                                <svg v-else class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                </svg>
                            </div>

                            <!-- Info -->
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2">
                                    <span class="text-sm font-medium text-gray-800">
                                        {{ $t(`cart.${order.type.toLowerCase()}`) }}
                                    </span>
                                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-600">
                                        <span class="w-1.5 h-1.5 rounded-full bg-red-400 status-pulse" />
                                        {{ getStatus(getTrackedOrder(order).status) }}
                                    </span>
                                </div>
                                <p class="mt-0.5 text-xs text-gray-400 tabular-nums" data-allow-mismatch="text">
                                    {{ formatDate(order.createdAt) }}
                                </p>
                                <!-- Compact timeline (collapsed only) -->
                                <div v-if="!isExpanded(order.id)" class="mt-2">
                                    <OrderStatusTimeline :order="getTrackedOrder(order)" compact />
                                </div>
                            </div>

                            <!-- Price + chevron -->
                            <div class="flex items-center gap-2 ml-1 flex-shrink-0">
                                <span class="text-sm font-bold text-gray-900 tabular-nums">{{ formatPrice(order.totalPrice) }}</span>
                                <span class="chevron-icon" :class="{ 'rotate-180': isExpanded(order.id) }">
                                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path d="M19 9l-7 7-7-7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
                                    </svg>
                                </span>
                            </div>
                        </button>

                        <!-- Expanded content -->
                        <transition
                            :css="false"
                            @before-enter="accordionBeforeEnter" @enter="accordionEnter" @after-enter="accordionAfterEnter"
                            @before-leave="accordionBeforeLeave" @leave="accordionLeave" @after-leave="accordionAfterLeave"
                        >
                            <div v-show="isExpanded(order.id)" class="relative z-[1] px-4 pb-4" style="background: radial-gradient(ellipse at 30% 20%, rgba(255,245,238,0.4), transparent 60%)">
                                <!-- Full timeline -->
                                <div class="mb-4">
                                    <OrderStatusTimeline :order="getTrackedOrder(order)" />
                                </div>

                                <!-- Estimated ready time badge -->
                                <div
                                    v-if="getTrackedOrder(order).estimatedReadyTime"
                                    class="mb-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-100/80"
                                >
                                    <svg class="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" />
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2" />
                                    </svg>
                                    <span class="text-xs font-medium text-amber-700 tabular-nums">~{{ formatReadyTime(getTrackedOrder(order).estimatedReadyTime!) }}</span>
                                </div>

                                <!-- Delivery address -->
                                <div v-if="order.address" class="mb-3 p-3 bg-gray-50/80 rounded-lg border border-gray-100/80">
                                    <span class="text-[10px] text-gray-400 uppercase tracking-widest font-medium">{{ $t('checkout.deliveryAddress') }}</span>
                                    <p class="mt-0.5 text-sm text-gray-700">{{ formatAddress(order.address) }}</p>
                                </div>

                                <!-- Receipt items -->
                                <div class="space-y-0">
                                    <div
                                        v-for="(item, idx) in order.items" :key="idx"
                                        class="flex items-baseline gap-2 py-1.5"
                                        :class="idx > 0 ? 'receipt-divider' : ''"
                                    >
                                        <span class="text-gray-400 tabular-nums text-xs w-5 text-right flex-shrink-0">x{{ item.quantity }}</span>
                                        <span class="text-[13px] text-gray-700 flex-1 min-w-0 truncate">
                                            <span v-if="item.product.code" class="text-gray-400 mr-1">{{ item.product.code }}</span>
                                            {{ item.product.name }}
                                            <span v-if="item.choice" class="text-gray-400 text-xs ml-0.5">({{ item.choice.name }})</span>
                                        </span>
                                        <span class="text-xs text-gray-500 tabular-nums flex-shrink-0">{{ formatPrice(item.totalPrice) }}</span>
                                    </div>
                                </div>

                                <!-- Total -->
                                <div class="mt-3 pt-2.5 border-t border-gray-200 flex items-center justify-between">
                                    <span class="text-xs font-medium text-gray-400 uppercase tracking-wider">{{ $t('me.orders.total') }}</span>
                                    <span class="text-[15px] font-bold text-gray-900 tabular-nums">{{ formatPrice(order.totalPrice) }}</span>
                                </div>
                            </div>
                        </transition>
                    </div>
                </div>

                <!-- ━━ Torii Gate Divider ━━ -->
                <div v-if="activeOrders.length && visiblePastOrders.length" class="flex items-center gap-3 my-5">
                    <div class="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300/40 to-transparent" />
                    <svg class="w-5 h-5 text-gray-300/50 flex-shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" aria-hidden="true">
                        <line x1="6" y1="5" x2="6" y2="18" />
                        <line x1="14" y1="5" x2="14" y2="18" />
                        <line x1="3" y1="5" x2="17" y2="5" />
                        <line x1="5" y1="9" x2="15" y2="9" />
                    </svg>
                    <div class="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300/40 to-transparent" />
                </div>

                <!-- ━━ Past Orders ━━ -->
                <div :class="activeOrders.length ? '' : 'pt-3'" class="space-y-2">
                    <div
                        v-for="order in visiblePastOrders" :key="order.id"
                        class="past-card relative bg-white rounded-xl border-l-[3px] shadow-sm transition-shadow hover:shadow-md"
                        :class="orderBorderClass(order.status)"
                    >
                        <!-- Hanko seal for completed orders (nijuumaru double circle) -->
                        <div v-if="isOrderSuccess(order.status)" class="hanko-seal" :style="{ transform: hankoRotation(order.id) }" aria-hidden="true">{{ hankoKanji(order.status) }}</div>

                        <!-- Card header -->
                        <button
                            type="button"
                            :aria-expanded="isExpanded(order.id)"
                            :aria-label="$t('me.orders.toggleOrder')"
                            class="w-full text-left p-4 cursor-pointer hover:bg-gray-50/50 rounded-xl flex items-center gap-3 transition-colors"
                            @click="toggleOrder(order.id)"
                        >
                            <!-- Type icon -->
                            <div
                                class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                :class="iconBgClass(order.status)"
                            >
                                <!-- Moped icon for delivery (Tabler Icons) -->
                                <svg v-if="order.type === 'DELIVERY'" class="w-5 h-5" :class="iconColorClass(order.status)" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                                    <path d="M16 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
                                    <path d="M5 16v1a2 2 0 0 0 4 0v-5h-3a3 3 0 0 0 -3 3v1h10a6 6 0 0 1 5 -4v-5a2 2 0 0 0 -2 -2h-1" />
                                    <path d="M6 9l3 0" />
                                </svg>
                                <svg v-else class="w-5 h-5" :class="iconColorClass(order.status)" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                </svg>
                            </div>

                            <!-- Info -->
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2">
                                    <span class="text-sm font-medium text-gray-700">
                                        {{ $t(`cart.${order.type.toLowerCase()}`) }}
                                    </span>
                                    <span
                                        class="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium"
                                        :class="statusBadgeClass(order.status)"
                                    >
                                        {{ getStatus(order.status) }}
                                    </span>
                                </div>
                                <p class="mt-0.5 text-xs text-gray-400 tabular-nums" data-allow-mismatch="text">
                                    {{ formatDate(order.createdAt) }}
                                </p>
                            </div>

                            <!-- Price + chevron -->
                            <div class="flex items-center gap-2 ml-1 flex-shrink-0">
                                <span class="text-sm font-semibold text-gray-800 tabular-nums">{{ formatPrice(order.totalPrice) }}</span>
                                <span class="chevron-icon" :class="{ 'rotate-180': isExpanded(order.id) }">
                                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path d="M19 9l-7 7-7-7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
                                    </svg>
                                </span>
                            </div>
                        </button>

                        <!-- Expanded content -->
                        <transition
                            :css="false"
                            @before-enter="accordionBeforeEnter" @enter="accordionEnter" @after-enter="accordionAfterEnter"
                            @before-leave="accordionBeforeLeave" @leave="accordionLeave" @after-leave="accordionAfterLeave"
                        >
                            <div v-show="isExpanded(order.id)" class="px-4 pb-4" style="background: radial-gradient(ellipse at 30% 20%, rgba(255,245,238,0.4), transparent 60%)">
                                <!-- Delivery address -->
                                <div v-if="order.address" class="mb-3 p-3 bg-gray-50/80 rounded-lg border border-gray-100/80">
                                    <span class="text-[10px] text-gray-400 uppercase tracking-widest font-medium">{{ $t('checkout.deliveryAddress') }}</span>
                                    <p class="mt-0.5 text-sm text-gray-700">{{ formatAddress(order.address) }}</p>
                                </div>

                                <!-- Receipt items -->
                                <div class="space-y-0">
                                    <div
                                        v-for="(item, idx) in order.items" :key="idx"
                                        class="flex items-baseline gap-2 py-1.5"
                                        :class="idx > 0 ? 'receipt-divider' : ''"
                                    >
                                        <span class="text-gray-400 tabular-nums text-xs w-5 text-right flex-shrink-0">x{{ item.quantity }}</span>
                                        <span class="text-[13px] text-gray-700 flex-1 min-w-0 truncate">
                                            <span v-if="item.product.code" class="text-gray-400 mr-1">{{ item.product.code }}</span>
                                            {{ item.product.name }}
                                            <span v-if="item.choice" class="text-gray-400 text-xs ml-0.5">({{ item.choice.name }})</span>
                                        </span>
                                        <span class="text-xs text-gray-500 tabular-nums flex-shrink-0">{{ formatPrice(item.totalPrice) }}</span>
                                    </div>
                                </div>

                                <!-- Total -->
                                <div class="mt-3 pt-2.5 border-t border-gray-200 flex items-center justify-between">
                                    <span class="text-xs font-medium text-gray-400 uppercase tracking-wider">{{ $t('me.orders.total') }}</span>
                                    <span class="text-[15px] font-bold text-gray-900 tabular-nums">{{ formatPrice(order.totalPrice) }}</span>
                                </div>

                                <!-- Re-order button -->
                                <button
                                    v-if="isOrderSuccess(order.status)"
                                    class="reorder-btn mt-4 w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-red-200 bg-transparent px-4 py-2.5 text-sm font-medium text-red-500 transition-all duration-300 hover:border-solid hover:border-red-500 hover:bg-red-500 hover:text-white"
                                    @click="reorder(order)"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.182" />
                                    </svg>
                                    {{ $t('reorder.button') }}
                                </button>

                                <!-- Arigatou micro-text -->
                                <span v-if="isOrderSuccess(order.status)" class="block text-right mt-2 text-[10px] text-gray-300 italic select-none pointer-events-none"
                                      style="font-family: 'Hiragino Mincho ProN', 'Yu Mincho', serif"
                                      aria-hidden="true">ありがとう</span>
                            </div>
                        </transition>
                    </div>
                </div>

                <!-- Load more -->
                <button
                    v-if="hasMorePast"
                    class="group mt-3 w-full rounded-xl border border-dashed border-gray-300 hover:border-red-300 bg-white/40 hover:bg-tsb-four/50 py-3 flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer"
                    @click="loadMore"
                >
                    <span class="text-xs font-medium text-gray-400 group-hover:text-red-500 transition-colors duration-300">
                        {{ remainingPastCount <= LOAD_STEP
                            ? $t('me.orders.loadMoreLast', { count: remainingPastCount })
                            : $t('me.orders.loadMore', { count: nextPastBatchCount })
                        }}
                    </span>
                    <svg
                        class="w-3.5 h-3.5 text-gray-300 group-hover:text-red-400 transition-all duration-300 group-hover:translate-y-0.5"
                        fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
                    >
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </template>

            <!-- Empty state -->
            <div v-else class="py-10 text-center">
                <div class="relative w-20 h-20 flex items-center justify-center mx-auto mb-4">
                    <!-- Enso (Zen brush circle) -->
                    <svg class="absolute inset-0 w-full h-full text-gray-200/60" viewBox="0 0 80 80" fill="none" aria-hidden="true">
                        <path d="M40 6 C58 6 72 18 73 36 C74 54 62 70 44 73 C26 76 10 64 7 46 C4 28 14 12 32 8"
                              stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" />
                    </svg>
                    <div class="w-14 h-14 rounded-full bg-white flex items-center justify-center">
                        <svg class="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M4 12h16c0 4.418-3.582 8-8 8s-8-3.582-8-8z" />
                            <path class="steam steam-1" stroke-linecap="round" d="M9 9c.5-1.5 1-2.5.5-4" opacity="0.4" />
                            <path class="steam steam-2" stroke-linecap="round" d="M12 8c.5-1.5 1-2.5.5-4" opacity="0.4" />
                            <path class="steam steam-3" stroke-linecap="round" d="M15 9c.5-1.5 1-2.5.5-4" opacity="0.4" />
                        </svg>
                    </div>
                </div>
                <p class="text-sm text-gray-500">{{ $t('me.orders.empty') }}</p>
            </div>

        </div>
    </article>
</template>

<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useGqlQuery, useGqlSubscription } from '#imports'
import type { Order } from '~/types'
import OrderStatusTimeline from '~/components/order/OrderStatusTimeline.vue'
import { formatAddress } from '~/utils/utils'
import { formatPrice } from '~/lib/price'
import gql from 'graphql-tag'
import { print } from 'graphql/index'
import { useI18n } from 'vue-i18n'
import { useReorder } from '~/composables/useReorder'

const { t, locale } = useI18n()
const { reorder } = useReorder()

const dateLocaleMap: Record<string, string> = { fr: 'fr-BE', en: 'en-GB', zh: 'zh-CN' }
const dateLocale = computed(() => dateLocaleMap[locale.value] || 'fr-BE')

const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(dateLocale.value, {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
    })

const formatReadyTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(dateLocale.value, {
        hour: '2-digit', minute: '2-digit',
    })

// ── Data ──

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
const orders = computed<Order[] | null>(() => dataOrders.value?.myOrders ?? null)

// ── Active / Past split ──

const activeOrders = computed(() =>
    (orders.value ?? []).filter(o => !isOrderCompleted(getTrackedOrder(o).status))
)
const pastOrders = computed(() =>
    (orders.value ?? []).filter(o => isOrderCompleted(getTrackedOrder(o).status))
)
const visiblePastOrders = computed(() => pastOrders.value.slice(0, visibleCount.value))
const remainingPastCount = computed(() => Math.max(0, pastOrders.value.length - visibleCount.value))
const hasMorePast = computed(() => remainingPastCount.value > 0)
const nextPastBatchCount = computed(() => Math.min(LOAD_STEP, remainingPastCount.value))

const loadMore = () => { visibleCount.value += LOAD_STEP }

// ── Expand / Collapse ──

const expandedOrders = ref(new Set<string>())

const toggleOrder = (orderId: string) => {
    if (expandedOrders.value.has(orderId)) {
        expandedOrders.value.delete(orderId)
    } else {
        expandedOrders.value.add(orderId)
    }
}

const isExpanded = (orderId: string) => expandedOrders.value.has(orderId)

// ── Status helpers ──

const isOrderCompleted = (status: string) => ['DELIVERED', 'PICKED_UP', 'CANCELLED', 'FAILED'].includes(status)
const isOrderSuccess = (status: string) => ['DELIVERED', 'PICKED_UP'].includes(status)
const isOrderFailed = (status: string) => ['CANCELLED', 'FAILED'].includes(status)

const iconBgClass = (status: string) => {
    if (isOrderSuccess(status)) return 'bg-emerald-50'
    if (isOrderFailed(status)) return 'bg-amber-50'
    return 'bg-rose-50'
}

const iconColorClass = (status: string) => {
    if (isOrderSuccess(status)) return 'text-emerald-500'
    if (isOrderFailed(status)) return 'text-amber-500'
    return 'text-rose-400'
}

const getStatus = (status: string) => {
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

const orderBorderClass = (status: string) => {
    if (isOrderSuccess(status)) return 'border-l-emerald-500'
    if (isOrderFailed(status)) return 'border-l-amber-400'
    return 'border-l-rose-400'
}

const statusBadgeClass = (status: string) => {
    if (isOrderSuccess(status)) return 'bg-emerald-50 text-emerald-700'
    if (isOrderFailed(status)) return 'bg-amber-50 text-amber-700'
    return 'bg-rose-50 text-rose-600'
}

// ── Hanko seal helpers ──

const hankoKanji = (status: string) => {
    if (status === 'DELIVERED') return '済'
    if (status === 'PICKED_UP') return '取'
    return '済'
}

const hankoRotation = (orderId: string) => {
    const deg = orderId.charCodeAt(orderId.length - 1) % 10 - 5
    return `rotate(${deg}deg)`
}

// ── Live subscriptions ──

const liveOrderData = ref<Record<string, Partial<Order>>>({})
const subscriptionStops = new Map<string, () => void>()

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

const subscribeToOrder = (orderId: string) => {
    if (subscriptionStops.has(orderId)) return

    const { data: liveUpdate, stop } = useGqlSubscription<{ myOrderUpdated: Partial<Order> }>(
        print(SUB_ORDER_UPDATES), { orderId }
    )

    subscriptionStops.set(orderId, stop)

    watch(liveUpdate, (val) => {
        if (val?.myOrderUpdated) {
            liveOrderData.value[orderId] = {
                ...liveOrderData.value[orderId],
                ...val.myOrderUpdated
            }
            if (isOrderCompleted(val.myOrderUpdated.status ?? '')) {
                unsubscribeFromOrder(orderId)
            }
        }
    })
}

const unsubscribeFromOrder = (orderId: string) => {
    const stopFn = subscriptionStops.get(orderId)
    if (stopFn) {
        stopFn()
        subscriptionStops.delete(orderId)
    }
}

onUnmounted(() => {
    subscriptionStops.forEach((stopFn) => stopFn())
    subscriptionStops.clear()
})

const getTrackedOrder = (order: Order): Order => {
    const live = liveOrderData.value[order.id]
    return live ? { ...order, ...live } as Order : order
}

// ── Accordion transitions ──

const accordionBeforeEnter = (el: Element) => {
    const h = el as HTMLElement
    h.style.height = '0'
    h.style.overflow = 'hidden'
    h.style.opacity = '0'
}
const accordionEnter = (el: Element, done: () => void) => {
    const h = el as HTMLElement
    h.style.transition = 'height 300ms ease-out, opacity 300ms ease-out'
    h.style.height = `${h.scrollHeight}px`
    h.style.opacity = '1'
    h.addEventListener('transitionend', done, { once: true })
}
const accordionAfterEnter = (el: Element) => {
    const h = el as HTMLElement
    h.style.height = ''
    h.style.overflow = ''
    h.style.transition = ''
    h.style.opacity = ''
}
const accordionBeforeLeave = (el: Element) => {
    const h = el as HTMLElement
    h.style.height = `${h.scrollHeight}px`
    h.style.overflow = 'hidden'
}
const accordionLeave = (el: Element, done: () => void) => {
    const h = el as HTMLElement
    void h.offsetHeight
    h.style.transition = 'height 250ms ease-in, opacity 200ms ease-in'
    h.style.height = '0'
    h.style.opacity = '0'
    h.addEventListener('transitionend', done, { once: true })
}
const accordionAfterLeave = (el: Element) => {
    const h = el as HTMLElement
    h.style.height = ''
    h.style.overflow = ''
    h.style.transition = ''
    h.style.opacity = ''
}

// ── Mount ──

onMounted(() => {
    const allOrders = orders.value ?? []

    // Subscribe to all active orders
    allOrders
        .filter(o => !isOrderCompleted(o.status))
        .forEach(o => {
            subscribeToOrder(o.id)
            // Auto-expand active orders
            expandedOrders.value.add(o.id)
        })

    // Auto-expand from URL param
    const params = new URLSearchParams(window.location.search)
    const followId = params.get('followOrder')
    if (followId) {
        const order = allOrders.find(o => o.id === followId)
        if (order) expandedOrders.value.add(order.id)
    }
})
</script>

<style scoped>
/* ── Active card breathing glow ── */
.active-card {
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.08);
    animation: active-breathe 3s ease-in-out infinite;
}

@keyframes active-breathe {
    0%, 100% { box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 0 0 0 rgba(239, 68, 68, 0); }
    50% { box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 0 14px -3px rgba(239, 68, 68, 0.15); }
}

/* ── Status pulse dot ── */
.status-pulse {
    animation: status-dot 2s ease-in-out infinite;
}

@keyframes status-dot {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.5); opacity: 0.5; }
}

/* ── Hanko completion seal (nijuumaru double circle) ── */
.hanko-seal {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 28px;
    height: 28px;
    border: 2px solid rgba(239, 68, 68, 0.22);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(239, 68, 68, 0.30);
    font-size: 12px;
    font-weight: 800;
    pointer-events: none;
    z-index: 2;
    line-height: 1;
    box-shadow: inset 0 0 3px rgba(239, 68, 68, 0.06);
}

/* Nijuumaru outer ring */
.hanko-seal::before {
    content: '';
    position: absolute;
    inset: -4px;
    border: 1px solid rgba(239, 68, 68, 0.12);
    border-radius: 50%;
    pointer-events: none;
}

/* ── Chevron rotation ── */
.chevron-icon {
    transition: transform 200ms ease;
    display: flex;
    flex-shrink: 0;
}
.rotate-180 {
    transform: rotate(180deg);
}

/* ── Reorder button focus + icon spin ── */
.reorder-btn:focus-visible {
    outline: 2px solid #ef4444;
    outline-offset: 2px;
}
.reorder-btn:hover svg {
    animation: spin-once 500ms ease;
}

@keyframes spin-once {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

/* ── Hanko seal hover intensification ── */
.past-card:hover .hanko-seal {
    color: rgba(239, 68, 68, 0.45);
    border-color: rgba(239, 68, 68, 0.35);
    transition: color 300ms ease, border-color 300ms ease;
}
.past-card:hover .hanko-seal::before {
    border-color: rgba(239, 68, 68, 0.22);
    transition: border-color 300ms ease;
}

/* ── Seigaiha wave pattern on active cards ── */
.active-card::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 120px;
    background:
        radial-gradient(circle at 50% 100%, transparent 62%, rgba(156, 163, 175, 0.03) 63%, rgba(156, 163, 175, 0.03) 67%, transparent 68%),
        radial-gradient(circle at 0% 100%, transparent 62%, rgba(156, 163, 175, 0.03) 63%, rgba(156, 163, 175, 0.03) 67%, transparent 68%),
        radial-gradient(circle at 100% 100%, transparent 62%, rgba(156, 163, 175, 0.03) 63%, rgba(156, 163, 175, 0.03) 67%, transparent 68%);
    background-size: 20px 20px;
    mask-image: linear-gradient(to left, rgba(0,0,0,0.5), transparent);
    -webkit-mask-image: linear-gradient(to left, rgba(0,0,0,0.5), transparent);
    pointer-events: none;
    z-index: 0;
    border-radius: 0 0.75rem 0.75rem 0;
}

/* ── Chopstick rest dots between receipt items ── */
.receipt-divider {
    position: relative;
}
.receipt-divider::before {
    content: '\00B7  \00B7  \00B7';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 10px;
    letter-spacing: 2px;
    color: #e5e7eb;
    pointer-events: none;
}

/* ── Steam animation on empty state ── */
.steam {
    animation: steam-float 3s ease-in-out infinite;
    transform-origin: center bottom;
}
.steam-1 { animation-delay: 0s; }
.steam-2 { animation-delay: 0.6s; }
.steam-3 { animation-delay: 1.2s; }

@keyframes steam-float {
    0%, 100% { transform: translateY(0) scaleY(1); opacity: 0.3; }
    50% { transform: translateY(-1px) scaleY(1.1); opacity: 0.5; }
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
    .active-card { animation: none; }
    .status-pulse { animation: none; }
    .steam { animation: none; }
    .reorder-btn:hover svg { animation: none; }
}
</style>
