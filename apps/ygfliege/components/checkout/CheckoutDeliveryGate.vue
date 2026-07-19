<template>
    <section
        class="max-w-2xl mx-auto mb-8 card p-6 sm:p-8"
        role="region"
        :aria-labelledby="titleId"
    >
        <!-- Header -->
        <header class="mb-6">
            <div class="mb-2">
                <h2
                    :id="titleId"
                    class="text-xl sm:text-2xl font-semibold text-ygf-black tracking-wide"
                >
                    {{ $t('delivery.gate.title') }}
                </h2>
            </div>
            <p class="text-sm text-ygf-gray-400 leading-relaxed">
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
