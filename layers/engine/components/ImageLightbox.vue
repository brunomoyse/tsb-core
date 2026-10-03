<template>
  <Teleport to="body">
    <transition name="lightbox">
      <div
        v-if="visible"
        ref="overlayRef"
        role="dialog"
        aria-modal="true"
        :aria-label="alt || $t('common.image')"
        class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
        @click.self="close"
      >
        <!-- Close button (white ring: the brand focus colour does not reach 3:1 on the dark overlay) -->
        <button
          ref="closeRef"
          type="button"
          :aria-label="$t('common.close')"
          class="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          :style="{ marginTop: 'env(safe-area-inset-top, 0px)' }"
          @click="close"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <!-- Product name -->
        <p
          v-if="alt"
          class="absolute bottom-6 left-0 right-0 text-center text-white/80 text-sm font-medium px-6"
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
            @error="onImageError"
          />
        </picture>
      </div>
    </transition>
  </Teleport>
</template>

<script lang="ts" setup>
import * as productImage from '#engine/utils/productImage'
import { ref } from 'vue'
import { useBodyScrollLock } from '#engine/composables/useBodyScrollLock'
import { useFocusTrap } from '#engine/composables/useFocusTrap'

const { src, alt } = defineProps<{
  src: string
  alt?: string
}>()

const visible = ref(false)
const overlayRef = ref<HTMLElement | null>(null)
const closeRef = ref<HTMLElement | null>(null)

// The control that opened the lightbox gets focus back (a product modal's image button, a cart thumbnail...).
let opener: HTMLElement | null = null
const open = () => {
  opener = document.activeElement as HTMLElement | null
  visible.value = true
}
const close = () => {
  visible.value = false
}

// Dialog behaviour. The trap's Escape stops the key right there, so an enclosing product modal (which listens on
// `document`) stays open, and Tab cannot reach the modal hidden behind the overlay (audit A4).
useFocusTrap(overlayRef, {
  initialFocus: () => closeRef.value,
  returnFocus: () => opener,
  onEscape: close,
})
// Saves the page's previous overflow and restores exactly that (a product modal underneath keeps its own lock).
useBodyScrollLock(visible)

const onImageError = (event: Event): void => {
  productImage.handleProductImageError(event, 'classic')
}

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
