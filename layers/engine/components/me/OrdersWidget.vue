<template>
    <article class="bg-tsb-two rounded-2xl overflow-hidden" data-testid="orders-widget">

        <!-- ── Header ── -->
        <div class="px-6 pt-6 sm:px-7 sm:pt-7">
            <div class="relative overflow-hidden flex items-center justify-between">
                <h2 class="font-semibold text-neutral-900 text-[15px] flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                        <svg class="w-4 h-4 text-neutral-700" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                        </svg>
                    </div>
                    {{ $t('me.orders.recentTitle') }}
                </h2>
                <!-- Kanji watermark -->
                <span v-if="japaneseAccents" class="absolute bottom-0 right-2 text-8xl leading-none pointer-events-none select-none text-primary-500/[0.04] after:content-[attr(data-glyph)]"
                      data-glyph="注文"
                      style="font-family: 'Hiragino Mincho ProN', 'Yu Mincho', 'MS PMincho', serif"
                      aria-hidden="true" />
                <NuxtLinkLocale
                    to="/me/orders"
                    class="text-xs font-medium text-neutral-600 hover:text-primary-700 transition inline-flex items-center gap-1 group"
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
                    stroke="currentColor" stroke-width="0.8" class="text-neutral-400/30"
                />
            </svg>
        </div>

        <!-- ── Content ── -->
        <div class="px-6 pb-6 sm:px-7 sm:pb-7">

            <!-- Loading shimmer -->
            <div v-if="orders === null && !ordersFailed" class="space-y-3 pt-3">
                <div v-for="i in 3" :key="i" class="h-[68px] rounded-xl bg-white/50 animate-shimmer" style="background-size: 200% 100%; background-image: linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.6) 50%, transparent 75%)" />
            </div>

            <!-- The load failed: an error with Retry, never a skeleton that does not end or a false "no orders" -->
            <LoadError
                v-else-if="ordersFailed"
                :message="$t('notify.errors.ordersLoadFailed')"
                :busy="ordersPending"
                data-testid="orders-widget-load-error"
                class="mt-3 rounded-xl p-4 bg-red-50 border border-red-200 text-red-800"
                @retry="refetchOrders()"
            />

            <template v-else-if="orders?.length">

                <!-- ━━ Active Orders ━━ -->
                <div v-if="activeOrders.length" class="pt-3 space-y-3">
                    <div
                        v-for="order in activeOrders"
                        :id="`order-card-${order.id}`"
                        :key="order.id"
                        :class="['active-card relative bg-white rounded-xl border-l-[3px] border-l-primary-400', japaneseAccents ? 'active-card-seigaiha' : '']"
                    >
                        <!-- Card header -->
                        <button
                            type="button"
                            :aria-expanded="isExpanded(order.id)"
                            class="relative z-[1] w-full text-left p-4 cursor-pointer hover:bg-neutral-50/50 rounded-xl flex items-center gap-3 transition-colors"
                            @click="toggleOrder(order.id)"
                        >
                            <!-- Type icon -->
                            <div class="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                                <!-- Moped icon for delivery (Tabler Icons) -->
                                <svg v-if="order.type === 'DELIVERY'" class="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                                    <path d="M16 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
                                    <path d="M5 16v1a2 2 0 0 0 4 0v-5h-3a3 3 0 0 0 -3 3v1h10a6 6 0 0 1 5 -4v-5a2 2 0 0 0 -2 -2h-1" />
                                    <path d="M6 9l3 0" />
                                </svg>
                                <svg v-else class="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                </svg>
                            </div>

                            <!-- Info -->
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2">
                                    <span class="text-sm font-medium text-neutral-800 whitespace-nowrap">
                                        {{ $t(`cart.${order.type.toLowerCase()}`) }}
                                    </span>
                                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 whitespace-nowrap shrink-0">
                                        <span class="w-1.5 h-1.5 rounded-full bg-primary-400 status-pulse" />
                                        {{ getStatus(getTrackedOrder(order).status) }}
                                    </span>
                                </div>
                                <p class="mt-0.5 text-xs text-neutral-600 tabular-nums" data-allow-mismatch="text">
                                    {{ formatDate(order.createdAt) }}
                                </p>
                            </div>

                            <!-- Price + chevron -->
                            <div class="flex items-center gap-2 ml-1 flex-shrink-0">
                                <span class="text-sm font-bold text-neutral-900 tabular-nums">{{ formatPrice(order.totalPrice) }}</span>
                                <span class="chevron-icon" :class="{ 'rotate-180': isExpanded(order.id) }">
                                    <svg class="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                <!-- Vertical timeline -->
                                <div class="mb-3">
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
                                    <span class="text-xs font-medium text-amber-800 tabular-nums">~{{ formatReadyTime(getTrackedOrder(order).estimatedReadyTime!) }}</span>
                                </div>

                                <!-- Delivery address -->
                                <div v-if="order.address" class="mb-3 p-3 bg-neutral-50/80 rounded-lg border border-neutral-100/80">
                                    <span class="text-xs text-neutral-600 uppercase tracking-widest font-medium">{{ $t('checkout.deliveryAddress') }}</span>
                                    <p class="mt-0.5 text-sm text-neutral-700 whitespace-pre-line">{{ formatAddress(order.address) }}</p>
                                </div>

                                <!-- Receipt items -->
                                <div class="space-y-0">
                                    <div
                                        v-for="(item, idx) in order.items" :key="idx"
                                        class="flex items-baseline gap-2 py-1.5"
                                        :class="idx > 0 ? 'receipt-divider' : ''"
                                    >
                                        <span class="text-neutral-600 tabular-nums text-xs w-5 text-right flex-shrink-0">x{{ item.quantity }}</span>
                                        <span class="text-xs text-neutral-700 flex-1 min-w-0">
                                            <span v-if="orderItemMeta(item)" class="block text-xs text-neutral-600 truncate leading-tight">
                                                {{ orderItemMeta(item) }}
                                            </span>
                                            <span class="block text-neutral-700 leading-tight line-clamp-2">
                                                {{ orderItemName(item) }}
                                            </span>
                                            <span v-if="orderItemChoice(item)" data-testid="order-item-choices" class="block text-neutral-600 text-xs leading-snug">{{ orderItemChoice(item) }}</span>
                                        </span>
                                        <span class="text-xs text-neutral-600 tabular-nums flex-shrink-0">{{ formatPrice(item.totalPrice) }}</span>
                                    </div>
                                </div>

                                <!-- Total -->
                                <div class="mt-3 pt-2.5 border-t border-neutral-200 flex items-center justify-between">
                                    <span class="text-xs font-medium text-neutral-600 uppercase tracking-wider">{{ $t('me.orders.total') }}</span>
                                    <span class="text-[15px] font-bold text-neutral-900 tabular-nums">{{ formatPrice(order.totalPrice) }}</span>
                                </div>
                            </div>
                        </transition>
                    </div>
                </div>

                <!-- ━━ Section divider (torii gate for brands with Japanese accents) ━━ -->
                <div v-if="activeOrders.length && visiblePastOrders.length" class="flex items-center gap-3 my-5">
                    <div class="flex-1 h-px bg-gradient-to-r from-transparent via-neutral-300/40 to-transparent" />
                    <svg v-if="japaneseAccents" class="w-5 h-5 text-neutral-300/50 flex-shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" aria-hidden="true">
                        <line x1="6" y1="5" x2="6" y2="18" />
                        <line x1="14" y1="5" x2="14" y2="18" />
                        <line x1="3" y1="5" x2="17" y2="5" />
                        <line x1="5" y1="9" x2="15" y2="9" />
                    </svg>
                    <div class="flex-1 h-px bg-gradient-to-r from-transparent via-neutral-300/40 to-transparent" />
                </div>

                <!-- ━━ Past Orders ━━ -->
                <div :class="activeOrders.length ? '' : 'pt-3'" class="space-y-2">
                    <div
                        v-for="order in visiblePastOrders" :id="`order-card-${order.id}`" :key="order.id"
                        class="past-card relative bg-white rounded-xl border-l-[3px] shadow-sm transition-shadow hover:shadow-md"
                        :class="orderBorderClass(order.status)"
                    >
                        <!-- Hanko seal for completed orders (nijuumaru double circle) -->
                        <div v-if="japaneseAccents && isOrderSuccess(order.status)" class="hanko-seal" :style="{ transform: hankoRotation(order.id) }" aria-hidden="true">{{ hankoKanji(order.status) }}</div>

                        <!-- Card header -->
                        <button
                            type="button"
                            :aria-expanded="isExpanded(order.id)"
                            class="w-full text-left p-4 cursor-pointer hover:bg-neutral-50/50 rounded-xl flex items-center gap-3 transition-colors"
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
                                    <span class="text-sm font-medium text-neutral-700 whitespace-nowrap">
                                        {{ $t(`cart.${order.type.toLowerCase()}`) }}
                                    </span>
                                    <span
                                        class="inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0"
                                        :class="statusBadgeClass(order.status)"
                                    >
                                        {{ getStatus(order.status) }}
                                    </span>
                                </div>
                                <p class="mt-0.5 text-xs text-neutral-600 tabular-nums" data-allow-mismatch="text">
                                    {{ formatDate(order.createdAt) }}
                                </p>
                            </div>

                            <!-- Price + chevron -->
                            <div class="flex items-center gap-2 ml-1 flex-shrink-0">
                                <span class="text-sm font-semibold text-neutral-800 tabular-nums">{{ formatPrice(order.totalPrice) }}</span>
                                <span class="chevron-icon" :class="{ 'rotate-180': isExpanded(order.id) }">
                                    <svg class="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                <!-- Cancellation reason -->
                                <div
                                    v-if="order.status === 'CANCELLED' && order.cancellationReason && order.cancellationReason !== 'OTHER'"
                                    class="mb-3 p-3 bg-red-50/70 rounded-lg border border-red-100/80"
                                >
                                    <span class="text-xs text-red-700 uppercase tracking-widest font-medium">{{ $t('orderCompleted.cancellationReasonLabel') }}</span>
                                    <p class="mt-0.5 text-sm text-red-700">{{ $t(`orderCompleted.cancellationReasons.${order.cancellationReason}`) }}</p>
                                </div>

                                <!-- Delivery address -->
                                <div v-if="order.address" class="mb-3 p-3 bg-neutral-50/80 rounded-lg border border-neutral-100/80">
                                    <span class="text-xs text-neutral-600 uppercase tracking-widest font-medium">{{ $t('checkout.deliveryAddress') }}</span>
                                    <p class="mt-0.5 text-sm text-neutral-700 whitespace-pre-line">{{ formatAddress(order.address) }}</p>
                                </div>

                                <!-- Receipt items -->
                                <div class="space-y-0">
                                    <div
                                        v-for="(item, idx) in order.items" :key="idx"
                                        class="flex items-baseline gap-2 py-1.5"
                                        :class="idx > 0 ? 'receipt-divider' : ''"
                                    >
                                        <span class="text-neutral-600 tabular-nums text-xs w-5 text-right flex-shrink-0">x{{ item.quantity }}</span>
                                        <span class="text-xs text-neutral-700 flex-1 min-w-0">
                                            <span v-if="orderItemMeta(item)" class="block text-xs text-neutral-600 truncate leading-tight">
                                                {{ orderItemMeta(item) }}
                                            </span>
                                            <span class="block text-neutral-700 leading-tight line-clamp-2">
                                                {{ orderItemName(item) }}
                                            </span>
                                            <span v-if="orderItemChoice(item)" data-testid="order-item-choices" class="block text-neutral-600 text-xs leading-snug">{{ orderItemChoice(item) }}</span>
                                        </span>
                                        <span class="text-xs text-neutral-600 tabular-nums flex-shrink-0">{{ formatPrice(item.totalPrice) }}</span>
                                    </div>
                                </div>

                                <!-- Total -->
                                <div class="mt-3 pt-2.5 border-t border-neutral-200 flex items-center justify-between">
                                    <span class="text-xs font-medium text-neutral-600 uppercase tracking-wider">{{ $t('me.orders.total') }}</span>
                                    <span class="text-[15px] font-bold text-neutral-900 tabular-nums">{{ formatPrice(order.totalPrice) }}</span>
                                </div>

                                <!-- Re-order button -->
                                <button
                                    v-if="isOrderSuccess(order.status)"
                                    class="reorder-btn mt-4 w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary-200 bg-transparent px-4 py-2.5 text-sm font-medium text-primary-700 transition-all duration-300 hover:border-solid hover:border-primary hover:bg-primary-600 hover:text-white"
                                    @click="reorder(order)"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.182" />
                                    </svg>
                                    {{ $t('reorder.button') }}
                                </button>

                                <!-- Download Invoice button -->
                                <button
                                    v-if="isOrderSuccess(order.status)"
                                    class="mt-2 w-full flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-tsb-four/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    @click.stop="downloadInvoice(order.id)"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                    </svg>
                                    {{ $t('me.orders.downloadInvoice') }}
                                </button>

                                <!-- Arigatou micro-text -->
                                <span v-if="japaneseAccents && isOrderSuccess(order.status)" class="block text-right mt-2 text-xs text-neutral-600 italic select-none pointer-events-none"
                                      style="font-family: 'Hiragino Mincho ProN', 'Yu Mincho', serif"
                                      aria-hidden="true">ありがとう</span>
                            </div>
                        </transition>
                    </div>
                </div>

                <!-- Load more -->
                <button
                    v-if="hasMorePast"
                    class="group mt-3 w-full rounded-xl border border-dashed border-neutral-300 hover:border-primary-300 bg-white/40 hover:bg-tsb-four/50 py-3 flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer"
                    @click="loadMore"
                >
                    <span class="text-xs font-medium text-neutral-600 group-hover:text-primary-700 transition-colors duration-300">
                        {{ remainingPastCount <= LOAD_STEP
                            ? $t('me.orders.loadMoreLast', { count: remainingPastCount })
                            : $t('me.orders.loadMore', { count: nextPastBatchCount })
                        }}
                    </span>
                    <svg
                        class="w-3.5 h-3.5 text-neutral-600 group-hover:text-primary-400 transition-all duration-300 group-hover:translate-y-0.5"
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
                    <svg class="absolute inset-0 w-full h-full text-neutral-200/60" viewBox="0 0 80 80" fill="none" aria-hidden="true">
                        <path d="M40 6 C58 6 72 18 73 36 C74 54 62 70 44 73 C26 76 10 64 7 46 C4 28 14 12 32 8"
                              stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" />
                    </svg>
                    <div class="w-14 h-14 rounded-full bg-white flex items-center justify-center">
                        <svg class="w-7 h-7 text-neutral-300" fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M4 12h16c0 4.418-3.582 8-8 8s-8-3.582-8-8z" />
                            <path class="steam steam-1" stroke-linecap="round" d="M9 9c.5-1.5 1-2.5.5-4" opacity="0.4" />
                            <path class="steam steam-2" stroke-linecap="round" d="M12 8c.5-1.5 1-2.5.5-4" opacity="0.4" />
                            <path class="steam steam-3" stroke-linecap="round" d="M15 9c.5-1.5 1-2.5.5-4" opacity="0.4" />
                        </svg>
                    </div>
                </div>
                <p class="text-sm text-neutral-600">{{ $t('me.orders.empty') }}</p>
            </div>

        </div>
    </article>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { formatDateTime, formatTime } from '#engine/utils/datetime'
import { isOrderCompleted, useOrderTracking } from '#engine/composables/useOrderTracking'
import LoadError from '#engine/components/LoadError.vue'
import { ORDER_ITEMS_SELECTION } from '#engine/lib/orderDocuments'
import type { Order } from '#engine/types'
import OrderStatusTimeline from '~/components/order/OrderStatusTimeline.vue'
import { formatAddress } from '#engine/utils/utils'
import { formatPrice } from '#engine/lib/price'
import gql from 'graphql-tag'
import { print } from 'graphql/index'
import { useDateLocale } from '#engine/composables/useDateLocale'
import { useGqlQuery } from '#imports'
import { useI18n } from 'vue-i18n'
import { useInvoiceDownload } from '#engine/composables/useInvoiceDownload'
import { useOrderItemLabel } from '#engine/composables/useOrderItemLabel'
import { useReorder } from '#engine/composables/useReorder'

const { japaneseAccents = false } = useAppConfig().brand
const { t } = useI18n()
const { downloadInvoice } = useInvoiceDownload()
const { reorder } = useReorder()

const dateLocale = useDateLocale()

const formatDate = (iso: string) => formatDateTime(iso, dateLocale.value)

const formatReadyTime = (iso: string) => formatTime(iso, dateLocale.value)

// ── Data ──

const LOAD_STEP = 5
const visibleCount = ref(LOAD_STEP)

const MY_ORDERS = gql`
  {
    myOrders(first: 5) {
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
      ${ORDER_ITEMS_SELECTION}
    }
  }
`

const { data: dataOrders, error: ordersError, pending: ordersPending, refresh: refetchOrders } = await useGqlQuery<{ myOrders: Order[] }>(print(MY_ORDERS), {}, { server: false })
// Null means loading, or failed (see ordersFailed): the empty state is only for a list that loaded and is empty.
const orders = computed<Order[] | null>(() => dataOrders.value?.myOrders ?? null)
const ordersFailed = computed(() => orders.value === null && Boolean(ordersError.value))

/* Live tracking (subscriptions, reconnect refetch, polling fallback, auto-expand
   of active orders, ?followOrder) is driven by watchers over the loaded orders:
   the query is client-only, so the list is still empty at setup/onMounted on a
   hard load. */
const {
    trackedOrders,
    getTrackedOrder,
    toggleOrder,
    isExpanded,
    getStatus,
    isOrderSuccess,
    isOrderFailed,
} = useOrderTracking({
    orders,
    refetch: refetchOrders,
    autoExpandActive: true,
    // A ?followOrder id that is a past order beyond the first page must be rendered before it is scrolled to.
    // `index` is the order's position in `orders`; the past list shows only the completed ones.
    revealOrder: (index) => {
        const list = orders.value ?? []
        if (!list[index] || !isOrderCompleted(list[index].status)) return
        const pastIndex = list.slice(0, index).filter((o) => isOrderCompleted(o.status)).length
        if (pastIndex >= visibleCount.value) visibleCount.value = pastIndex + 1
    },
})

const { orderItemMeta, orderItemName, orderItemChoice } = useOrderItemLabel()

// ── Active / Past split ──

const activeOrders = computed(() =>
    (trackedOrders.value ?? []).filter(o => !isOrderCompleted(o.status))
)
const pastOrders = computed(() =>
    (trackedOrders.value ?? []).filter(o => isOrderCompleted(o.status))
)
const visiblePastOrders = computed(() => pastOrders.value.slice(0, visibleCount.value))
const remainingPastCount = computed(() => Math.max(0, pastOrders.value.length - visibleCount.value))
const hasMorePast = computed(() => remainingPastCount.value > 0)
const nextPastBatchCount = computed(() => Math.min(LOAD_STEP, remainingPastCount.value))

const loadMore = () => { visibleCount.value += LOAD_STEP }

// ── Status helpers ──

const iconBgClass = (status: string) => {
    if (isOrderSuccess(status)) return 'bg-emerald-50'
    if (isOrderFailed(status)) return 'bg-amber-50'
    return 'bg-primary-50'
}

const iconColorClass = (status: string) => {
    if (isOrderSuccess(status)) return 'text-emerald-700'
    if (isOrderFailed(status)) return 'text-amber-800'
    return 'text-primary-400'
}

const orderBorderClass = (status: string) => {
    if (isOrderSuccess(status)) return 'border-l-emerald-500'
    if (isOrderFailed(status)) return 'border-l-amber-400'
    return 'border-l-primary-400'
}

const statusBadgeClass = (status: string) => {
    if (isOrderSuccess(status)) return 'bg-emerald-50 text-emerald-700'
    if (isOrderFailed(status)) return 'bg-amber-50 text-amber-800'
    return 'bg-primary-50 text-primary-700'
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
</script>

<style scoped>
/* ── Active card breathing glow ── */
.active-card {
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.08);
    animation: active-breathe 3s ease-in-out infinite;
}

@keyframes active-breathe {
    0%, 100% { box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 0 0 0 theme('colors.primary.500 / 0%'); }
    50% { box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 0 14px -3px theme('colors.primary.500 / 15%'); }
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
    border: 2px solid theme('colors.primary.500 / 22%');
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: theme('colors.primary.500 / 30%');
    font-size: 12px;
    font-weight: 800;
    pointer-events: none;
    z-index: 2;
    line-height: 1;
    box-shadow: inset 0 0 3px theme('colors.primary.500 / 6%');
}

/* Nijuumaru outer ring */
.hanko-seal::before {
    content: '';
    position: absolute;
    inset: -4px;
    border: 1px solid theme('colors.primary.500 / 12%');
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
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
}
@media (hover: hover) {
    .reorder-btn:hover svg {
        animation: spin-once 500ms ease;
    }
}

@keyframes spin-once {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

/* ── Hanko seal hover intensification ── */
@media (hover: hover) {
    .past-card:hover .hanko-seal {
        color: theme('colors.primary.500 / 45%');
        border-color: theme('colors.primary.500 / 35%');
        transition: color 300ms ease, border-color 300ms ease;
    }
    .past-card:hover .hanko-seal::before {
        border-color: theme('colors.primary.500 / 22%');
        transition: border-color 300ms ease;
    }
}

/* ── Seigaiha wave pattern on active cards (brands with japaneseAccents only) ── */
.active-card-seigaiha::before {
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
    color: theme('colors.neutral.200');
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
