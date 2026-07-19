<template>
    <Teleport to="body">
        <Transition name="zone-modal">
            <div
                v-if="open"
                class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50"
                @click.self="onBackdropClick"
                @keydown.esc="close"
            >
                <div
                    ref="modalRef"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delivery-zone-modal-title"
                    class="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-lg sm:mx-4 p-6 sm:p-7 max-h-[90vh] overflow-y-auto"
                    @click.stop
                >
                    <!-- Close button -->
                    <button
                        type="button"
                        @click="close"
                        :aria-label="$t('common.close')"
                        class="absolute top-3 right-3 min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                    >
                        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>

                    <!-- Header with Japanese accent -->
                    <header class="mb-5 pr-10">
                        <div class="flex items-baseline gap-2">
                            <h2
                                id="delivery-zone-modal-title"
                                class="text-base sm:text-2xl font-semibold text-gray-900 tracking-wide leading-tight"
                            >
                                {{ $t('delivery.modal.title') }}
                            </h2>
                            <span class="text-red-300/40 text-xs tracking-[0.2em]" aria-hidden="true">配達</span>
                        </div>
                        <p class="text-xs sm:text-sm text-gray-500 mt-1 truncate">{{ $t('delivery.modal.subtitle') }}</p>
                    </header>

                    <DeliveryZonePicker
                        :show-cancel="true"
                        @confirm="close"
                        @cancel="close"
                    />

                    <div class="safe-area-spacer-bottom sm:hidden" />
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import DeliveryZonePicker from '~/components/delivery/DeliveryZonePicker.vue'
import { useFocusTrap } from '#engine/composables/useFocusTrap'

const { open } = defineProps<{
    open: boolean
}>()

const emit = defineEmits<{
    'update:open': [value: boolean]
}>()

const modalRef = ref<HTMLElement | null>(null)
useFocusTrap(modalRef)

const close = () => {
    emit('update:open', false)
}

const onBackdropClick = () => {
    close()
}

// Lock body scroll while open
watch(() => open, (isOpen) => {
    if (!import.meta.client) return
    document.body.style.overflow = isOpen ? 'hidden' : ''
}, { immediate: true })
</script>

<style scoped>
.zone-modal-enter-active,
.zone-modal-leave-active {
    transition: opacity 0.2s ease;
}
.zone-modal-enter-active > div,
.zone-modal-leave-active > div {
    transition: transform 0.25s ease-out;
}
.zone-modal-enter-from,
.zone-modal-leave-to {
    opacity: 0;
}
.zone-modal-enter-from > div,
.zone-modal-leave-to > div {
    transform: translateY(16px);
}
</style>
