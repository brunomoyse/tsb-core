<template>
    <nav
        v-if="isCapacitor"
        class="capacitor-tab-bar fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200"
    >
        <div class="flex h-[56px]">
            <!-- Home -->
            <NuxtLinkLocale
                to="/"
                class="tab-item flex-1 flex flex-col items-center justify-center relative"
                :class="isHomeActive ? 'text-red-700' : 'text-gray-400'"
                @click="hapticTick"
            >
                <!-- iOS: top-border active indicator -->
                <span
                    v-if="isHomeActive && !isAndroid"
                    class="absolute top-0 inset-x-3 h-0.5 bg-red-500 rounded-full"
                />
                <!-- Android: pill | iOS: square rounded -->
                <div
                    class="relative flex items-center justify-center rounded-full transition-colors duration-200"
                    :class="[
                        isAndroid ? 'w-16 h-8' : 'w-10 h-10',
                        isHomeActive ? 'bg-tsb-four' : ''
                    ]"
                >
                    <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
                        <path d="M9 21V12h6v9"/>
                    </svg>
                </div>
                <span class="text-[10px] leading-none mt-0.5">{{ $t('nav.home') }}</span>
            </NuxtLinkLocale>

            <!-- Menu -->
            <NuxtLinkLocale
                to="/menu"
                class="tab-item flex-1 flex flex-col items-center justify-center relative"
                :class="isMenuActive ? 'text-red-700' : 'text-gray-400'"
                @click="hapticTick"
            >
                <span
                    v-if="isMenuActive && !isAndroid"
                    class="absolute top-0 inset-x-3 h-0.5 bg-red-500 rounded-full"
                />
                <div
                    class="relative flex items-center justify-center rounded-full transition-colors duration-200"
                    :class="[
                        isAndroid ? 'w-16 h-8' : 'w-10 h-10',
                        isMenuActive ? 'bg-tsb-four' : ''
                    ]"
                >
                    <img src="/icons/menu-icon.svg" alt="" class="w-5 h-5 select-none" draggable="false"/>
                </div>
                <span class="text-[10px] leading-none mt-0.5">{{ $t('nav.menu') }}</span>
            </NuxtLinkLocale>

            <!-- Cart -->
            <button
                type="button"
                class="tab-item flex-1 flex flex-col items-center justify-center relative"
                :class="isCartActive ? 'text-red-700' : 'text-gray-400'"
                @click="handleCartToggle"
            >
                <span
                    v-if="isCartActive && !isAndroid"
                    class="absolute top-0 inset-x-3 h-0.5 bg-red-500 rounded-full"
                />
                <div
                    class="relative flex items-center justify-center rounded-full transition-colors duration-200"
                    :class="[
                        isAndroid ? 'w-16 h-8' : 'w-10 h-10',
                        isCartActive ? 'bg-tsb-four' : ''
                    ]"
                >
                    <img src="/icons/shopping-bag-icon.svg" alt="" class="w-5 h-5 select-none" draggable="false"/>
                    <div
                        v-if="cartCount > 0"
                        :class="['absolute inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 border-2 border-white rounded-full -top-1 -right-1', badgeAnimating ? 'animate-bounce' : '']"
                    >
                        {{ cartCount }}
                    </div>
                </div>
                <span class="text-[10px] leading-none mt-0.5">{{ $t('nav.cart') }}</span>
            </button>

            <!-- Account -->
            <NuxtLinkLocale
                :to="authStore.user ? '/me' : '/auth/login'"
                class="tab-item flex-1 flex flex-col items-center justify-center relative"
                :class="isAcctActive ? 'text-red-700' : 'text-gray-400'"
                @click="hapticTick"
            >
                <span
                    v-if="isAcctActive && !isAndroid"
                    class="absolute top-0 inset-x-3 h-0.5 bg-red-500 rounded-full"
                />
                <div
                    class="relative flex items-center justify-center rounded-full transition-colors duration-200"
                    :class="[
                        isAndroid ? 'w-16 h-8' : 'w-10 h-10',
                        isAcctActive ? 'bg-tsb-four' : ''
                    ]"
                >
                    <img
                        :src="authStore.user ? '/icons/account-circle-icon.svg' : '/icons/login-icon.svg'"
                        alt=""
                        class="w-5 h-5 select-none"
                        draggable="false"
                    />
                </div>
                <span class="text-[10px] leading-none mt-0.5">
                    {{ authStore.user ? $t('nav.myAccount') : $t('nav.login') }}
                </span>
            </NuxtLinkLocale>
        </div>

        <div class="safe-area-spacer-bottom" />
    </nav>
</template>

<script lang="ts" setup>
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { computed, nextTick, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { usePlatform } from '~/composables/usePlatform'
import { useRoute } from 'vue-router'

const { isCapacitor, isAndroid } = usePlatform()
const cartStore = useCartStore()
const authStore = useAuthStore()
const route = useRoute()

const normalizedPath = computed(() => route.path.replace(/^\/[^/]+/, ''))

const isHomeActive = computed(() => normalizedPath.value === '/' || normalizedPath.value === '')
const isMenuActive = computed(() => normalizedPath.value === '/menu' || normalizedPath.value.startsWith('/menu/'))
const isCartActive = computed(() => cartStore.isCartVisible)
const isAcctActive = computed(() => normalizedPath.value === '/me' || normalizedPath.value.startsWith('/me/'))

const cartCount = computed(() => cartStore.totalItems)

const badgeAnimating = ref(false)
watch(cartCount, (newVal) => {
    if (newVal > 0) {
        nextTick(() => {
            badgeAnimating.value = true
            setTimeout(() => { badgeAnimating.value = false }, 600)
        })
    }
})

// Lightweight selection haptic for tab navigation (safe: component is always inside <ClientOnly>)
const hapticTick = () => {
    if (!isCapacitor) return
    Haptics.selectionChanged().catch(() => {})
}

const handleCartToggle = () => {
    hapticTick()
    cartStore.toggleCartVisibility()
}
</script>
