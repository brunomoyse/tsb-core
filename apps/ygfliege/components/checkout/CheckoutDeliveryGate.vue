<template>
    <section
        class="max-w-2xl mx-auto mb-8 bg-white border border-gray-100 rounded-2xl shadow-sm p-6 sm:p-8"
        role="region"
        :aria-labelledby="titleId"
    >
        <!-- Header with Japanese accent, mirroring the checkout page pattern -->
        <header class="mb-6">
            <div class="flex items-baseline gap-2 mb-2">
                <h2
                    :id="titleId"
                    class="text-xl sm:text-2xl font-semibold text-gray-900 tracking-wide"
                >
                    {{ $t('delivery.gate.title') }}
                </h2>
                <span class="text-ygf-orange-300/40 text-xs tracking-[0.2em]" aria-hidden="true">配達エリア</span>
            </div>
            <p class="text-sm text-gray-600 leading-relaxed">
                {{ $t('delivery.gate.subtitle') }}
            </p>
        </header>

        <DeliveryZonePicker :show-cancel="false" @confirm="handleConfirm" />
    </section>
</template>

<script lang="ts" setup>
import DeliveryZonePicker from '~/components/delivery/DeliveryZonePicker.vue'
import { useId } from 'vue'

const titleId = useId()

const emit = defineEmits<{
    confirm: []
}>()

const handleConfirm = () => {
    emit('confirm')
}
</script>
