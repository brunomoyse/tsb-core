<template>
  <Teleport to="body">
    <Transition name="confirm-fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
        @click.self="emit('cancel')"
      >
        <div
          ref="panelRef"
          role="alertdialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
          @keydown.esc.stop="emit('cancel')"
        >
          <h2 :id="titleId" class="text-center text-lg font-semibold text-neutral-900">
            {{ title }}
          </h2>
          <p v-if="message" class="mt-2 text-center text-sm text-neutral-600">{{ message }}</p>
          <div class="mt-6 flex gap-3">
            <UiButton variant="secondary" class="flex-1" @click="emit('cancel')">
              {{ cancelLabel || $t('common.cancel') }}
            </UiButton>
            <UiButton class="flex-1" data-testid="confirm-dialog-confirm" @click="emit('confirm')">
              {{ confirmLabel || $t('common.save') }}
            </UiButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts" setup>
import { nextTick, ref, useId, watch } from 'vue'

// Styled replacement for window.confirm(), matching the account modals.
const {
  open,
  message = undefined,
  confirmLabel = undefined,
  cancelLabel = undefined,
} = defineProps<{
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const titleId = useId()
const panelRef = ref<HTMLElement | null>(null)

// Move focus into the dialog when it opens so Escape and Tab act on it.
watch(
  () => open,
  async (isOpen) => {
    if (!isOpen) return
    await nextTick()
    panelRef.value?.querySelector<HTMLElement>('button')?.focus()
  },
)
</script>

<style scoped>
.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity 0.2s ease-out;
}
.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
}
</style>
