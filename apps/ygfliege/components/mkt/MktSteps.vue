<template>
    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div
            v-for="step in steps"
            :key="step.num"
            v-reveal="step.num"
            class="bg-white rounded-ygf-card shadow-ygf-sm hover:shadow-ygf-md transition-shadow duration-300 overflow-hidden"
        >
            <MktPicture
                :src="`/images/steps/step-${step.num}`"
                :widths="[400, 800]"
                :fallback-width="400"
                :alt="$t(`${keyPrefix}.step${step.num}.title`)"
                sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 92vw"
                img-class="w-full aspect-square object-cover"
            />
            <div class="p-5">
                <div class="flex items-center gap-2 mb-2">
                    <span class="w-7 h-7 rounded-full bg-ygf text-white text-sm font-bold flex items-center justify-center">{{ step.num }}</span>
                    <h3 class="font-display font-bold text-lg text-ygf-black">{{ $t(`${keyPrefix}.step${step.num}.title`) }}</h3>
                </div>
                <p class="text-sm text-gray-600 leading-relaxed">{{ $t(`${keyPrefix}.step${step.num}.desc`) }}</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
// 4-step "how it works" grid. The home and concept pages use different locale
// namespaces for the same structure, hence keyPrefix.
defineProps<{
    /** e.g. "mkt.home.steps" or "mkt.concept" */
    keyPrefix: string
}>()

const steps = [{ num: 1 }, { num: 2 }, { num: 3 }, { num: 4 }]
</script>
