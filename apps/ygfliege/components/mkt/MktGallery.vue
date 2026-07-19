<template>
    <div>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            <button
                v-for="(slug, i) in GALLERY_SLUGS"
                :key="slug"
                v-reveal="(i % 4) + 1"
                class="group rounded-ygf-card overflow-hidden shadow-ygf-sm hover:shadow-ygf-md transition-shadow duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ygf-orange-300"
                :aria-label="$t(`mkt.home.gallery.items.${i}`)"
                @click="openIndex = i"
            >
                <MktPicture
                    :src="`/images/gallery/${slug}`"
                    :widths="[480, 900, 1400]"
                    :fallback-width="900"
                    :alt="$t(`mkt.home.gallery.items.${i}`)"
                    sizes="(min-width: 1024px) 24vw, (min-width: 640px) 32vw, 46vw"
                    img-class="w-full aspect-[3/4] object-cover transition-transform duration-500 group-hover:scale-105"
                />
            </button>
        </div>

        <!-- Lightbox -->
        <Teleport to="body">
            <Transition name="mkt-lightbox">
                <div
                    v-if="openIndex !== null"
                    class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
                    @click.self="openIndex = null"
                >
                    <button
                        class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                        :aria-label="$t('common.close')"
                        @click="openIndex = null"
                    >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <figure class="max-w-[92vw] max-h-[82vh]">
                        <MktPicture
                            :src="`/images/gallery/${GALLERY_SLUGS[openIndex]}`"
                            :widths="[480, 900, 1400]"
                            :fallback-width="900"
                            :alt="$t(`mkt.home.gallery.items.${openIndex}`)"
                            sizes="92vw"
                            img-class="max-w-full max-h-[74vh] object-contain rounded-ygf-card"
                        />
                        <figcaption class="text-center text-white/80 text-sm mt-3">{{ $t(`mkt.home.gallery.items.${openIndex}`) }}</figcaption>
                    </figure>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

// Official "art of eating" photo cards from the franchiser kit.
const GALLERY_SLUGS = [
    'boiled-fish',
    'garlic-prawn-pasta',
    'japanese-tomato-pot',
    'korean-army-stew',
    'duck-blood-chili',
    'low-cal-dry-mix',
    'tomato-braised-beef',
    'seafood-beef-bone',
]

const openIndex = ref<number | null>(null)

const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') openIndex.value = null
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.mkt-lightbox-enter-active,
.mkt-lightbox-leave-active {
    transition: opacity 0.2s ease-out;
}
.mkt-lightbox-enter-from,
.mkt-lightbox-leave-to {
    opacity: 0;
}
</style>
