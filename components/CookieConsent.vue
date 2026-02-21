<template>
    <Transition name="slide-up">
        <div
            v-if="showBanner"
            class="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 shadow-lg p-4 sm:p-6"
        >
            <div class="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4">
                <p class="text-sm text-gray-600 flex-1 text-center sm:text-left">
                    {{ $t('cookies.message') }}
                    <NuxtLinkLocale to="/terms" class="underline text-gray-900 hover:text-gray-700">
                        {{ $t('cookies.learnMore') }}
                    </NuxtLinkLocale>
                </p>
                <div class="flex gap-3 shrink-0">
                    <button
                        class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        @click="decline"
                    >
                        {{ $t('cookies.decline') }}
                    </button>
                    <button
                        class="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
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
import { ref, onMounted } from 'vue'
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
.slide-up-enter-active,
.slide-up-leave-active {
    transition: transform 0.3s ease, opacity 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
    transform: translateY(100%);
    opacity: 0;
}
</style>
