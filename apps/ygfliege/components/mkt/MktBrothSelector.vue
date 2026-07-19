<template>
    <div class="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <!-- Broth photo -->
        <div class="relative order-1 lg:order-none">
            <Transition name="broth-fade" mode="out-in">
                <MktPicture
                    :key="active.slug"
                    :src="`/images/broths/${active.slug}`"
                    :widths="[480, 800, 1200]"
                    :fallback-width="800"
                    :alt="$t(`mkt.broths.${active.key}.name`)"
                    sizes="(min-width: 1024px) 44vw, 92vw"
                    img-class="w-full rounded-ygf-lg shadow-ygf-lg aspect-[4/3] object-cover"
                />
            </Transition>
        </div>

        <div>
            <!-- Broth tabs -->
            <div class="flex flex-wrap gap-2 mb-6" role="tablist">
                <button
                    v-for="broth in BROTHS"
                    :key="broth.key"
                    role="tab"
                    :aria-selected="broth.key === active.key"
                    class="px-4 py-2 rounded-ygf-btn text-sm font-medium transition-all duration-300 border"
                    :class="broth.key === active.key
                        ? 'bg-ygf text-white border-ygf shadow-ygf-md'
                        : 'bg-white text-gray-700 border-ygf-orange-200 hover:bg-ygf-orange-50'"
                    @click="activeKey = broth.key"
                >
                    {{ $t(`mkt.broths.${broth.key}.name`) }}
                </button>
            </div>

            <!-- Active broth details -->
            <Transition name="broth-fade" mode="out-in">
                <div :key="active.key">
                    <p class="font-serifzh text-xl text-ygf-dark mb-1">{{ $t(`mkt.broths.${active.key}.chinese`) }}</p>
                    <h3 class="font-display font-bold text-2xl text-ygf-black mb-3">
                        {{ $t(`mkt.broths.${active.key}.name`) }}
                        <span
                            v-if="active.vegan"
                            class="align-middle ml-2 inline-block text-[11px] font-body font-semibold uppercase tracking-wide bg-emerald-100 text-emerald-700 rounded-full px-2.5 py-0.5"
                        >{{ $t('mkt.broths.vegan_badge') }}</span>
                    </h3>
                    <p class="text-gray-600 leading-relaxed mb-4">{{ $t(`mkt.broths.${active.key}.desc`) }}</p>
                    <div class="flex flex-col gap-1.5 text-sm text-gray-500">
                        <p class="flex items-center gap-2">
                            <span aria-hidden="true">
                                <template v-if="active.spiceLevel === 0">🌿</template>
                                <template v-else>{{ '🌶️'.repeat(active.spiceLevel) }}</template>
                            </span>
                            {{ $t(`mkt.broths.${active.key}.spice`) }}
                        </p>
                        <p>
                            <span class="font-medium">{{ $t('mkt.broths.allergens_label') }}:</span>
                            {{ $t(`mkt.broths.${active.key}.allergens`) }}
                        </p>
                    </div>
                </div>
            </Transition>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { BROTHS } from '~/data/broths'

const activeKey = ref(BROTHS[0].key)
const active = computed(() => BROTHS.find((b) => b.key === activeKey.value) ?? BROTHS[0])
</script>

<style scoped>
.broth-fade-enter-active,
.broth-fade-leave-active {
    transition: opacity 0.25s ease-out, transform 0.25s ease-out;
}
.broth-fade-enter-from,
.broth-fade-leave-to {
    opacity: 0;
    transform: translateY(6px);
}
</style>
