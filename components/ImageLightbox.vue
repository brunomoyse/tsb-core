<template>
    <Teleport to="body">
        <transition name="lightbox">
            <div
                v-if="visible"
                class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                @click.self="close"
            >
                <!-- Close button -->
                <button
                    class="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors z-10"
                    :style="{ marginTop: 'env(safe-area-inset-top, 0px)' }"
                    @click="close"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <!-- Product name -->
                <p v-if="alt" class="absolute bottom-6 left-0 right-0 text-center text-white/80 text-sm font-medium px-6"
                   :style="{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }"
                >
                    {{ alt }}
                </p>

                <!-- Image -->
                <picture class="max-w-[90vw] max-h-[75vh] bg-white rounded-2xl p-3">
                    <source :srcset="`${src}.avif`" type="image/avif" />
                    <source :srcset="`${src}.webp`" type="image/webp" />
                    <img
                        :src="`${src}.png`"
                        :alt="alt"
                        class="max-w-full max-h-[75vh] object-contain"
                    />
                </picture>
            </div>
        </transition>
    </Teleport>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'

const { src, alt } = defineProps<{
    src: string
    alt?: string
}>()

const visible = ref(false)

const open = () => { visible.value = true }
const close = () => { visible.value = false }

const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && visible.value) close()
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))

// Prevent body scroll when lightbox is open
watch(visible, (v) => {
    document.body.style.overflow = v ? 'hidden' : ''
})

defineExpose({ open, close })
</script>

<style scoped>
.lightbox-enter-active {
    transition: opacity 0.25s ease-out;
}
.lightbox-leave-active {
    transition: opacity 0.2s ease-in;
}
.lightbox-enter-from,
.lightbox-leave-to {
    opacity: 0;
}
</style>
