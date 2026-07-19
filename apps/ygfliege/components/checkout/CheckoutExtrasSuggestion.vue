<!--
  Paid extras cross-sell component.
  NOT yet wired into checkout.vue — awaiting backend support for priced extras.
  The toggle currently pushes only { name } into cartStore.orderExtra; the `price`
  field is UI-only until the OrderExtra type and backend accept a price.
  TODO: confirm final pricing + backend contract before importing.
-->
<template>
    <section class="card p-5">
        <h2 class="text-lg font-bold text-ygf-black">
            {{ $t('checkout.addExtras', 'Add some extras?') }}
        </h2>
        <p class="text-sm text-ygf-gray-400 mt-1 mb-4">
            {{ $t('checkout.extrasDescription', 'Complete your order with some accompaniments') }}
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
                v-for="extra in PAID_EXTRAS"
                :key="extra.key"
                class="flex items-center justify-between gap-3 p-4 border rounded-xl cursor-pointer transition-colors"
                :class="isSelected(extra.key)
                    ? 'border-ygf-orange bg-ygf-orange-bg'
                    : 'border-subtle bg-ygf-white hover:border-ygf-orange'"
            >
                <span class="flex items-center gap-3 min-w-0">
                    <input
                        type="checkbox"
                        :checked="isSelected(extra.key)"
                        class="h-5 w-5 text-ygf-orange-on-white border-subtle rounded shrink-0 focus-visible:ring-2 focus-visible:ring-ygf-orange-300"
                        @change="toggle(extra.key)"
                    />
                    <span :class="['text-sm font-medium truncate', isSelected(extra.key) ? 'text-ygf-orange-text' : 'text-ygf-black']">
                        {{ extra.label }}
                    </span>
                </span>
                <span :class="['text-sm font-semibold shrink-0 tabular-nums', isSelected(extra.key) ? 'text-ygf-orange-text' : 'text-ygf-black']">
                    +{{ formatPrice(extra.price) }}
                </span>
            </label>
        </div>
    </section>
</template>

<script lang="ts" setup>
import { formatPrice } from '#engine/lib/price'
import { useCartStore } from '#engine/stores/cart'

const cartStore = useCartStore()

// Pending: confirm pricing with restaurant before wiring into checkout.vue. Backend does not yet accept priced extras — the price field here is UI-only.
const PAID_EXTRAS = [
    { key: 'extra_wasabi', label: 'Wasabi supplémentaire', price: 1 },
    { key: 'extra_soy', label: 'Sauce soja supplémentaire', price: 1 },
] as const

const isSelected = (key: string) =>
    cartStore.orderExtra?.some(o => o.name === key) ?? false

const toggle = (key: string) => {
    if (!cartStore.orderExtra) cartStore.orderExtra = []
    const idx = cartStore.orderExtra.findIndex(o => o.name === key)
    if (idx === -1) cartStore.orderExtra.push({ name: key })
    else cartStore.orderExtra.splice(idx, 1)
}
</script>
