<template>
    <!-- Pick-one with official broth photography, when every choice maps -->
    <div v-if="!isMulti && photoSlugs" class="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <button
            v-for="choice in sorted"
            :key="choice.id"
            type="button"
            :data-testid="`${prefix}-choice-${choice.id}`"
            :aria-pressed="api.quantityOf(choice) > 0"
            class="card card-interactive text-left overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ygf-orange focus-visible:ring-offset-2"
            :class="{ 'card-selected': api.quantityOf(choice) > 0 }"
            @click="api.selectExclusive(choice)"
        >
            <MktPicture
                :src="`/images/broths/${photoSlugs[choice.id]}`"
                :widths="[480, 800]"
                :fallback-width="800"
                :alt="choice.name"
                sizes="(min-width: 1024px) 260px, 45vw"
                img-class="w-full aspect-[4/3] object-cover"
            />
            <span class="block px-3 py-3 space-y-1">
                <span class="flex items-center justify-between gap-2">
                    <span translate="no" class="text-sm font-semibold text-ygf-black">{{ choice.name }}</span>
                    <span v-if="Number(choice.priceModifier) !== 0" class="text-xs text-ygf-orange-800 whitespace-nowrap">
                        {{ modifierLabel(choice) }}
                    </span>
                </span>
                <!-- Chili count, mirroring the official menu's spice legend -->
                <span
                    v-if="spiceLevelOf(choice) > 0"
                    class="flex items-center gap-0.5"
                    role="img"
                    :aria-label="$t('menu.spicy')"
                    :title="$t('menu.spicy')"
                >
                    <img
                        v-for="n in spiceLevelOf(choice)"
                        :key="n"
                        src="https://api.iconify.design/ph/pepper-fill.svg?color=%23D42B2B"
                        alt=""
                        aria-hidden="true"
                        class="w-3.5 h-3.5"
                    />
                </span>
            </span>
        </button>
    </div>

    <!-- Pick-one, text chips (spice level, or any group without photo coverage) -->
    <div v-else-if="!isMulti" class="flex flex-wrap gap-2">
        <button
            v-for="choice in sorted"
            :key="choice.id"
            type="button"
            :data-testid="`${prefix}-choice-${choice.id}`"
            :aria-pressed="api.quantityOf(choice) > 0"
            class="chip min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ygf-orange focus-visible:ring-offset-2"
            @click="api.selectExclusive(choice)"
        >
            <span translate="no">{{ choice.name }}</span>
            <span v-if="Number(choice.priceModifier) !== 0" class="text-xs opacity-80">
                {{ modifierLabel(choice) }}
            </span>
        </button>
    </div>

    <!-- Multi-select: stepper rows (the composer's ingredient catalogue) -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        <div
            v-for="choice in sorted"
            :key="choice.id"
            :data-testid="`${prefix}-choice-${choice.id}`"
            class="flex items-center gap-3 rounded-ygf-card border px-3 py-2 transition-colors"
            :class="api.quantityOf(choice) > 0
                ? 'border-ygf-orange bg-ygf-orange-50'
                : 'border-ygf-orange-100 bg-white'"
        >
            <span translate="no" class="flex-1 text-sm text-ygf-black">{{ choice.name }}</span>
            <span v-if="Number(choice.priceModifier) !== 0" class="text-xs text-ygf-black/50 whitespace-nowrap">
                {{ modifierLabel(choice) }}
            </span>
            <div class="stepper shrink-0">
                <button
                    type="button"
                    :data-testid="`${prefix}-choice-dec-${choice.id}`"
                    class="stepper-btn"
                    :aria-label="$t('cart.decreaseQty')"
                    :disabled="api.quantityOf(choice) === 0"
                    @click="api.decrementChoice(choice)"
                >&minus;</button>
                <span class="stepper-value text-sm">{{ api.quantityOf(choice) }}</span>
                <button
                    type="button"
                    :data-testid="`${prefix}-choice-inc-${choice.id}`"
                    class="stepper-btn"
                    :aria-label="$t('cart.increaseQty')"
                    :disabled="!api.canIncrement(choice)"
                    @click="api.incrementChoice(choice)"
                >+</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { ProductChoice, ProductChoiceGroup } from '#engine/types'
import { BROTHS, brothPhotoSlugs } from '~/data/broths'
import MktPicture from '~/components/mkt/MktPicture.vue'
import { computed } from 'vue'
import { formatPrice } from '#engine/lib/price'
import type { ProductChoicesApi } from '~/composables/useProductChoices'

/**
 * Renders one choice group's options — shared by ProductModal (fixed sets)
 * and BowlComposer so both surfaces present choices identically:
 *
 *  - pick-one groups whose names all match an official broth → photo cards
 *    (mirrors the "BASE DE SOUPE" cards of the official YGF France menu)
 *  - other pick-one groups (spice level) → chips
 *  - multi-select groups (composer ingredients) → stepper rows
 *
 * `prefix` namespaces the data-testids (`product-modal` / `bowl-composer`);
 * the e2e helper detects multi-select by the presence of `-choice-inc-`
 * buttons, so pick-one variants must never render them.
 */
const { group, prefix, api } = defineProps<{
    group: ProductChoiceGroup
    prefix: string
    api: ProductChoicesApi
}>()

const isMulti = computed(() => group.maxSelections > 1)

const sorted = computed(() =>
    group.choices.toSorted((a, b) => a.sortOrder - b.sortOrder))

const photoSlugs = computed(() => (isMulti.value ? null : brothPhotoSlugs(group.choices)))

const modifierLabel = (choice: ProductChoice) =>
    `${Number(choice.priceModifier) > 0 ? '+' : ''}${formatPrice(choice.priceModifier)}`

/** Chili count for a photo-card choice (0 = none, 1 = mild, 3 = pick-your-heat). */
const spiceLevelOf = (choice: ProductChoice): number => {
    const slug = photoSlugs.value?.[choice.id]
    if (!slug) return 0
    return BROTHS.find((broth) => broth.slug === slug)?.spiceLevel ?? 0
}
</script>
