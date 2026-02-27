<template>
    <Transition name="ck">
        <div
            v-if="showBanner"
            class="ck-card"
            role="dialog"
            aria-label="Cookie consent"
        >
            <!-- Kanji watermark -->
            <span class="ck-kanji" aria-hidden="true">承</span>

            <!-- Red left accent rule -->
            <span class="ck-rule" aria-hidden="true" />

            <!-- Cherry blossom decoration -->
            <div class="ck-blossom" aria-hidden="true">
                <span v-for="n in 5" :key="n" class="ck-petal" />
                <span class="ck-pistil" />
            </div>

            <div class="ck-body">
                <p class="ck-text">
                    {{ $t('cookies.message') }}
                    <NuxtLinkLocale to="/terms#cookies" class="ck-policy">
                        {{ $t('cookies.learnMore') }}
                    </NuxtLinkLocale>
                </p>

                <div class="ck-actions">
                    <button
                        class="ck-decline"
                        @click="decline"
                    >
                        {{ $t('cookies.decline') }}
                    </button>

                    <button
                        class="ck-accept"
                        @click="accept"
                    >
                        {{ $t('cookies.accept') }}
                    </button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue'

import { useTracking } from '~/composables/useTracking'

const { optIn, optOut, hasConsentChoice } = useTracking()
const showBanner = ref(false)

onMounted(() => {
    showBanner.value = !hasConsentChoice()
})

const accept = () => {
    optIn()
    showBanner.value = false
}

const decline = () => {
    optOut()
    showBanner.value = false
}
</script>

<style scoped>
/* ===== Floating card ===== */
.ck-card {
    position: fixed;
    bottom: 1.25rem;
    right: 1.25rem;
    z-index: 30;
    width: min(380px, calc(100vw - 2.5rem));
    padding: 1.5rem 1.5rem 1.5rem 1.75rem;
    border-radius: 12px;
    overflow: hidden;

    /* Washi paper feel */
    background:
        radial-gradient(ellipse at 20% 80%, rgba(242, 169, 189, 0.06) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 20%, rgba(255, 239, 239, 0.3) 0%, transparent 50%),
        linear-gradient(135deg, #F8F6F3 0%, #F5F3EF 40%, #F2EFEA 100%);
    box-shadow:
        0 8px 32px rgba(26, 23, 20, 0.08),
        0 2px 8px rgba(26, 23, 20, 0.04),
        inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

/* ===== Red left accent ===== */
.ck-rule {
    position: absolute;
    left: 0;
    top: 12px;
    bottom: 12px;
    width: 3px;
    background: #DC2626;
    border-radius: 0 2px 2px 0;
    animation: ck-rule-grow 0.5s 0.4s ease-out both;
}

@keyframes ck-rule-grow {
    from { transform: scaleY(0); opacity: 0; }
    to   { transform: scaleY(1); opacity: 1; }
}

/* ===== Kanji watermark (承 = consent/acceptance) ===== */
.ck-kanji {
    position: absolute;
    right: -8px;
    bottom: -16px;
    font-size: 8rem;
    line-height: 1;
    color: rgba(220, 38, 38, 0.04);
    font-family: 'Hiragino Mincho ProN', 'Yu Mincho', 'MS PMincho', 'Songti SC', serif;
    pointer-events: none;
    user-select: none;
}

/* ===== Cherry blossom ===== */
.ck-blossom {
    position: absolute;
    top: 12px;
    right: 14px;
    width: 22px;
    height: 22px;
    opacity: 0;
    animation:
        ck-bloom 0.6s 0.8s ease-out forwards,
        ck-spin 60s 1.4s linear infinite;
}

.ck-petal {
    position: absolute;
    width: 7px;
    height: 10px;
    background: linear-gradient(135deg, #fce4ec 30%, #f48fb1);
    border-radius: 50%;
    left: calc(50% - 3.5px);
    bottom: 50%;
    transform-origin: center bottom;
    opacity: 0.65;
}

.ck-petal:nth-child(1) { transform: rotate(0deg); }
.ck-petal:nth-child(2) { transform: rotate(72deg); }
.ck-petal:nth-child(3) { transform: rotate(144deg); }
.ck-petal:nth-child(4) { transform: rotate(216deg); }
.ck-petal:nth-child(5) { transform: rotate(288deg); }

.ck-pistil {
    position: absolute;
    width: 4px;
    height: 4px;
    background: #FFF8E1;
    border-radius: 50%;
    top: calc(50% - 2px);
    left: calc(50% - 2px);
    box-shadow: 0 0 3px rgba(255, 248, 225, 0.5);
}

@keyframes ck-bloom {
    from { opacity: 0; transform: scale(0.5); }
    to   { opacity: 1; transform: scale(1); }
}

@keyframes ck-spin {
    to { transform: rotate(360deg); }
}

/* ===== Body ===== */
.ck-body {
    position: relative;
    z-index: 1;
}

.ck-text {
    font-size: 0.8125rem;
    line-height: 1.65;
    color: #78716c;
    margin: 0 0 1rem;
    padding-right: 1.5rem;
}

.ck-policy {
    display: inline;
    color: #57534e;
    text-decoration: none;
    position: relative;
    font-weight: 500;
    transition: color 0.25s ease;
}

.ck-policy::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 100%;
    height: 1px;
    background: #DC2626;
    transform: scaleX(0);
    transform-origin: right;
    transition: transform 0.3s ease;
}

.ck-policy:hover {
    color: #DC2626;
}

.ck-policy:hover::after {
    transform: scaleX(1);
    transform-origin: left;
}

/* ===== Actions ===== */
.ck-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    justify-content: flex-end;
}

/* Decline — quiet text button */
.ck-decline {
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
    color: #a8a29e;
    background: none;
    border: none;
    cursor: pointer;
    position: relative;
    transition: color 0.25s ease;
    letter-spacing: 0.01em;
}

.ck-decline:hover {
    color: #78716c;
}

/* Accept — hanko seal-inspired button */
.ck-accept {
    position: relative;
    padding: 0.5rem 1.25rem;
    font-size: 0.8125rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: #fff;
    background: #DC2626;
    border: 2px solid #DC2626;
    border-radius: 4px;
    cursor: pointer;
    transform: rotate(-1deg);
    transition:
        transform 0.2s ease,
        box-shadow 0.2s ease,
        background-color 0.2s ease;
    box-shadow:
        0 1px 3px rgba(220, 38, 38, 0.2),
        inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}

.ck-accept::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 4px;
    border: 1px solid rgba(220, 38, 38, 0.3);
    pointer-events: none;
}

.ck-accept:hover {
    transform: rotate(0deg) scale(1.03);
    background: #B91C1C;
    border-color: #B91C1C;
    box-shadow:
        0 4px 12px rgba(220, 38, 38, 0.25),
        inset 0 0 0 1px rgba(255, 255, 255, 0.15);
}

.ck-accept:active {
    transform: rotate(0deg) scale(0.97);
    box-shadow: 0 1px 2px rgba(220, 38, 38, 0.2);
}

/* ===== Entrance / Exit transitions ===== */
.ck-enter-active {
    animation: ck-slide-in 0.5s ease-out both;
}

.ck-leave-active {
    animation: ck-slide-out 0.3s ease-in both;
}

@keyframes ck-slide-in {
    from {
        opacity: 0;
        transform: translateY(20px) scale(0.96);
        filter: blur(4px);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
        filter: blur(0);
    }
}

@keyframes ck-slide-out {
    from {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
    to {
        opacity: 0;
        transform: translateY(12px) scale(0.97);
    }
}

/* ===== Mobile ===== */
@media (max-width: 639px) {
    .ck-card {
        bottom: 0.75rem;
        right: 0.75rem;
        left: 0.75rem;
        width: auto;
    }
}

/* ===== Reduced motion ===== */
@media (prefers-reduced-motion: reduce) {
    .ck-rule,
    .ck-blossom {
        animation: none !important;
        opacity: 1 !important;
    }

    .ck-enter-active,
    .ck-leave-active {
        animation: none !important;
    }

    .ck-accept {
        transform: none;
    }

    .ck-accept:hover {
        transform: scale(1.03);
    }
}
</style>
