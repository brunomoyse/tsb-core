<template>
    <nav
        v-if="isCapacitor"
        class="capacitor-tab-bar fixed z-50"
        :class="isIos
            ? 'ios-glass-bar bottom-[10px] left-[48px] right-[48px] rounded-[24px]'
            : 'bottom-0 inset-x-0 bg-white border-t border-gray-200'"
    >
        <div :class="isIos ? 'flex h-[54px]' : 'flex h-[56px]'">
            <!-- Home -->
            <NuxtLinkLocale
                to="/"
                class="tab-item flex-1 flex flex-col items-center justify-center relative active:scale-95 transition-transform"
                :class="isHomeActive
                    ? (isIos ? 'text-red-500' : 'text-red-700')
                    : 'text-gray-400'"
                @click="hapticTick"
            >
                <div
                    class="relative flex items-center justify-center rounded-full transition-all duration-200"
                    :class="[
                        isAndroid ? 'w-16 h-8' : 'w-14 h-8',
                        isAndroid
                            ? (isHomeActive ? 'bg-tsb-four' : '')
                            : (isHomeActive ? 'bg-red-500 text-white ios-icon-invert' : '')
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
                class="tab-item flex-1 flex flex-col items-center justify-center relative active:scale-95 transition-transform"
                :class="isMenuActive
                    ? (isIos ? 'text-red-500' : 'text-red-700')
                    : 'text-gray-400'"
                @click="hapticTick"
            >
                <div
                    class="relative flex items-center justify-center rounded-full transition-all duration-200"
                    :class="[
                        isAndroid ? 'w-16 h-8' : 'w-14 h-8',
                        isAndroid
                            ? (isMenuActive ? 'bg-tsb-four' : '')
                            : (isMenuActive ? 'bg-red-500 text-white ios-icon-invert' : '')
                    ]"
                >
                    <img src="/icons/menu-icon.svg" alt="" class="w-5 h-5 select-none" draggable="false"/>
                </div>
                <span class="text-[10px] leading-none mt-0.5">{{ $t('nav.menu') }}</span>
            </NuxtLinkLocale>

            <!-- Cart -->
            <NuxtLinkLocale
                to="/cart"
                class="tab-item flex-1 flex flex-col items-center justify-center relative active:scale-95 transition-transform"
                :class="isCartActive
                    ? (isIos ? 'text-red-500' : 'text-red-700')
                    : 'text-gray-400'"
                @click="hapticTick"
            >
                <div
                    class="relative flex items-center justify-center rounded-full transition-all duration-200"
                    :class="[
                        isAndroid ? 'w-16 h-8' : 'w-14 h-8',
                        isAndroid
                            ? (isCartActive ? 'bg-tsb-four' : '')
                            : (isCartActive ? 'bg-red-500 text-white ios-icon-invert' : '')
                    ]"
                >
                    <img src="/icons/shopping-bag-icon.svg" alt="" class="w-5 h-5 select-none" draggable="false"/>
                    <div
                        v-if="cartCount > 0"
                        :class="['absolute inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-bold text-white bg-red-500 rounded-full -top-1.5 -right-1.5', badgeAnimating ? 'animate-bounce' : '']"
                    >
                        {{ cartCount }}
                    </div>
                </div>
                <span class="text-[10px] leading-none mt-0.5">{{ $t('nav.cart') }}</span>
            </NuxtLinkLocale>

            <!-- Account -->
            <NuxtLinkLocale
                :to="authStore.user ? '/me' : '/auth/login'"
                class="tab-item flex-1 flex flex-col items-center justify-center relative active:scale-95 transition-transform"
                :class="isAcctActive
                    ? (isIos ? 'text-red-500' : 'text-red-700')
                    : 'text-gray-400'"
                @click="hapticTick"
            >
                <div
                    class="relative flex items-center justify-center rounded-full transition-all duration-200"
                    :class="[
                        isAndroid ? 'w-16 h-8' : 'w-14 h-8',
                        isAndroid
                            ? (isAcctActive ? 'bg-tsb-four' : '')
                            : (isAcctActive ? 'bg-red-500 text-white ios-icon-invert' : '')
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
import { computed, nextTick, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useHaptics } from '~/composables/useHaptics'
import { usePlatform } from '~/composables/usePlatform'
import { useRoute } from 'vue-router'

const { isCapacitor, isAndroid, isIos } = usePlatform()
const { selection } = useHaptics()
const cartStore = useCartStore()
const authStore = useAuthStore()
const route = useRoute()

const normalizedPath = computed(() => route.path.replace(/^\/[^/]+/, ''))

const isHomeActive = computed(() => normalizedPath.value === '/' || normalizedPath.value === '')
const isMenuActive = computed(() => normalizedPath.value === '/menu' || normalizedPath.value.startsWith('/menu/'))
const isCartActive = computed(() => normalizedPath.value === '/cart')
const isAcctActive = computed(() => normalizedPath.value === '/me' || normalizedPath.value.startsWith('/me/') || normalizedPath.value.startsWith('/auth/'))

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

const hapticTick = () => selection()

</script>

<style scoped>
/* iOS floating glass tab bar */
.ios-glass-bar {
    background: rgba(255, 255, 255, 0.45);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    backdrop-filter: saturate(180%) blur(20px);
    box-shadow:
        0 0 0 0.5px rgba(0, 0, 0, 0.08),
        0 4px 16px rgba(0, 0, 0, 0.10),
        inset 0 0.5px 0 rgba(255, 255, 255, 0.7);
    padding: 0 4px;
}

/* Floating bar sits above safe area; zero out the inner spacer */
.ios-glass-bar .safe-area-spacer-bottom {
    height: 0px;
}

/* Invert img icons to white inside the active brand pill */
.ios-icon-invert img {
    filter: brightness(0) invert(1);
}

/* Spring timing on tab press */
.tab-item {
    transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}
</style>
