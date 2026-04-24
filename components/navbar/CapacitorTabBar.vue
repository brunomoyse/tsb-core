<template>
    <nav
        v-if="isCapacitor"
        class="capacitor-tab-bar fixed bottom-0 inset-x-0 z-50"
        :class="isIos ? 'cap-tab-bar-ios' : 'cap-tab-bar-android'"
        aria-label="Bottom navigation"
    >
        <div class="cap-tab-shell">
            <!-- Home -->
            <NuxtLinkLocale
                to="/"
                class="tab-item cap-tab-item"
                :class="isHomeActive ? 'cap-tab-active' : 'cap-tab-inactive'"
                :aria-current="isHomeActive ? 'page' : undefined"
                data-testid="cap-tab-home"
                @click="hapticTick"
            >
                <svg class="cap-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M3 10.5L12 3l9 7.5"/>
                    <path d="M5 9.75V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.75"/>
                    <path d="M9.5 21v-6h5v6"/>
                </svg>
                <span class="cap-tab-label">{{ $t('nav.home') }}</span>
            </NuxtLinkLocale>

            <!-- Menu -->
            <NuxtLinkLocale
                to="/menu"
                class="tab-item cap-tab-item"
                :class="isMenuActive ? 'cap-tab-active' : 'cap-tab-inactive'"
                :aria-current="isMenuActive ? 'page' : undefined"
                data-testid="cap-tab-menu"
                @click="hapticTick"
            >
                <svg class="cap-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <rect x="4" y="5" width="16" height="4" rx="1.5"/>
                    <rect x="4" y="10" width="16" height="4" rx="1.5"/>
                    <rect x="4" y="15" width="16" height="4" rx="1.5"/>
                </svg>
                <span class="cap-tab-label">{{ $t('nav.menu') }}</span>
            </NuxtLinkLocale>

            <!-- Cart -->
            <NuxtLinkLocale
                to="/cart"
                class="tab-item cap-tab-item"
                :class="isCartActive ? 'cap-tab-active' : 'cap-tab-inactive'"
                :aria-current="isCartActive ? 'page' : undefined"
                data-testid="cap-tab-cart"
                @click="hapticTick"
            >
                <div class="relative">
                    <svg class="cap-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M6 7h14l-1.3 7.1a2 2 0 0 1-2 1.6H9a2 2 0 0 1-2-1.6L5.2 4.8A1 1 0 0 0 4.2 4H3"/>
                        <circle cx="9.5" cy="19" r="1.4"/>
                        <circle cx="16.5" cy="19" r="1.4"/>
                    </svg>
                    <div
                        v-if="cartCount > 0"
                        :class="['cap-cart-badge', badgeAnimating ? 'animate-bounce' : '']"
                    >
                        {{ cartBadgeLabel }}
                    </div>
                </div>
                <span class="cap-tab-label">{{ $t('nav.cart') }}</span>
            </NuxtLinkLocale>

            <!-- Account -->
            <NuxtLinkLocale
                :to="authStore.user ? '/me' : '/auth/login'"
                class="tab-item cap-tab-item"
                :class="isAcctActive ? 'cap-tab-active' : 'cap-tab-inactive'"
                :aria-current="isAcctActive ? 'page' : undefined"
                data-testid="cap-tab-account"
                @click="hapticTick"
            >
                <svg class="cap-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="8" r="3.2"/>
                    <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6"/>
                </svg>
                <span class="cap-tab-label">
                    {{ authStore.user ? $t('nav.myAccount') : $t('nav.login') }}
                </span>
            </NuxtLinkLocale>
        </div>

        <div class="safe-area-spacer-bottom" />
    </nav>
</template>

<script lang="ts" setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useHaptics } from '~/composables/useHaptics'
import { usePlatform } from '~/composables/usePlatform'
import { useRoute } from 'vue-router'

const { isCapacitor, isIos } = usePlatform()
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
const cartBadgeLabel = computed(() => (cartCount.value > 99 ? '99+' : String(cartCount.value)))

const badgeAnimating = ref(false)
let badgeTimer: ReturnType<typeof setTimeout> | null = null

watch(cartCount, (newVal, oldVal) => {
    if (newVal > 0 && newVal > oldVal) {
        if (badgeTimer) {
            clearTimeout(badgeTimer)
            badgeTimer = null
        }
        nextTick(() => {
            badgeAnimating.value = true
            badgeTimer = setTimeout(() => {
                badgeAnimating.value = false
                badgeTimer = null
            }, 600)
        })
    }
})

onUnmounted(() => {
    if (badgeTimer) {
        clearTimeout(badgeTimer)
        badgeTimer = null
    }
})

const hapticTick = () => selection()

</script>

<style scoped>
.cap-tab-bar-ios,
.cap-tab-bar-android {
    --cap-tab-bg: rgba(246, 245, 242, 0.97);
    --cap-tab-fg: #6b7280;
    --cap-tab-active-color: #b91c1c;
    --cap-tab-border: rgba(148, 163, 184, 0.28);
    background: linear-gradient(180deg, rgba(246, 245, 242, 0.95) 0%, rgba(240, 235, 227, 0.98) 100%);
    border-top: 1px solid var(--cap-tab-border);
}

.cap-tab-bar-ios::before,
.cap-tab-bar-android::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.85) 18%, rgba(255, 255, 255, 0.65) 82%, transparent 100%);
}

.cap-tab-bar-ios {
    -webkit-backdrop-filter: saturate(130%) blur(14px);
    backdrop-filter: saturate(130%) blur(14px);
}

.cap-tab-shell {
    display: flex;
    height: var(--cap-tab-height, 60px);
}

.cap-tab-item {
    flex: 1;
    display: flex;
    min-width: 0;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    position: relative;
    text-decoration: none;
    transition: color 0.2s ease-out, transform 0.16s ease-out;
}

.cap-tab-item::before {
    content: '';
    position: absolute;
    width: 38px;
    height: 30px;
    border-radius: 9999px;
    background: radial-gradient(circle, rgba(220, 38, 38, 0.18) 0%, rgba(220, 38, 38, 0.05) 62%, rgba(220, 38, 38, 0) 100%);
    transform: translateY(-5px);
    opacity: 0;
    transition: opacity 0.22s ease-out;
}

.cap-tab-item:active {
    transform: scale(0.96);
}

.cap-tab-icon {
    width: 21px;
    height: 21px;
}

.cap-tab-label {
    max-width: 96%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 10.5px;
    line-height: 1;
    letter-spacing: 0.01em;
}

.cap-tab-active {
    color: var(--cap-tab-active-color);
}

.cap-tab-active::before {
    opacity: 1;
}

.cap-tab-active .cap-tab-icon {
    transform: translateY(-1px);
}

.cap-tab-inactive {
    color: var(--cap-tab-fg);
}

.cap-cart-badge {
    position: absolute;
    top: -5px;
    right: -8px;
    display: inline-flex;
    min-width: 17px;
    height: 17px;
    padding: 0 4px;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    background: #ef4444;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    box-shadow: 0 0 0 2px rgba(246, 245, 242, 0.97);
}

@media (prefers-reduced-motion: reduce) {
    .cap-tab-item,
    .cap-tab-item::before,
    .cap-tab-active .cap-tab-icon {
        transition: none;
        transform: none;
    }
}
</style>
