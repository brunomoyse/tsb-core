<template>
  <div
    ref="rootRef"
    data-focus-trap-companion
    class="notification-bar fixed left-1/2 transform -translate-x-1/2 z-[100] w-[500px] max-w-[calc(100vw-2rem)] px-4"
    v-if="visible"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
    @focusin="focused = true"
    @focusout="onFocusOut"
    @keydown.esc="close"
  >
    <transition name="slide-up">
      <div
        :class="['rounded-2xl shadow-xl px-5 py-3 flex flex-col', variantClasses]"
        v-if="visible"
      >
        <div class="flex items-center justify-between gap-3">
          <span class="flex-1 text-sm font-medium break-words py-1">
            {{ message }}
          </span>
          <!-- Custom action button (e.g. Undo) takes precedence -->
          <button
            v-if="action"
            type="button"
            class="flex-shrink-0 min-h-9 bg-white text-neutral-900 px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-neutral-100 active:scale-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            @click="invokeAction"
          >
            {{ action.label }}
          </button>
          <!-- Cookie consent: an explicit accept, never a close (closing is not consent) -->
          <slot v-else-if="cookieConsent" name="action">
            <button
              type="button"
              class="flex-shrink-0 min-h-9 bg-white text-neutral-900 px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-neutral-100 active:scale-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              @click="close"
              :aria-label="$t('cookies.acceptAria')"
            >
              {{ $t('cookies.accept') }}
            </button>
          </slot>
          <!-- Every other toast can be closed -->
          <button
            v-if="!cookieConsent"
            type="button"
            data-testid="notification-close"
            :aria-label="$t('common.close')"
            class="-mr-3 -my-1.5 inline-flex min-h-11 min-w-11 flex-shrink-0 items-center justify-center rounded-full opacity-70 hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-800"
            @click="close"
          >
            <svg
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <!-- Progress bar: a CSS animation over the toast's duration; it stops while the toast is hovered or focused, like its timer -->
        <div
          v-if="!persistent && !cookieConsent"
          class="w-full mt-2 h-0.5 bg-white/20 rounded overflow-hidden"
        >
          <div
            class="h-full progress-bar"
            :class="progressBarClass"
            :style="{
              animationDuration: duration + 'ms',
              animationPlayState: paused ? 'paused' : 'running',
            }"
          ></div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useHaptics } from '#engine/composables/useHaptics'
import { useNotificationsStore } from '#engine/stores/notifications'

const { notification: hapticNotification } = useHaptics()

const {
  message,
  persistent = false,
  duration = 4500,
  cookieConsent = false,
  variant = 'neutral',
  action,
} = defineProps<{
  message: string
  persistent?: boolean
  duration?: number
  cookieConsent?: boolean
  variant?: string
  action?: { label: string; handler: () => void }
}>()

const emit = defineEmits<{
  close: []
}>()
const visible = ref(false)
const rootRef = ref<HTMLElement | null>(null)

/*
 * Announcing the toast to screen readers is ToastAnnouncer's job (a live region that is always mounted);
 * this component is only the visual toast, with its Undo / close buttons.
 *
 * The expiry timer lives in the notifications store (module scope); this component only tells it
 * when the toast is being read: the clock stops while the pointer is over the toast or focus is
 * inside it (an Undo that is being reached for must not vanish), and runs on again after.
 */
const notifications = useNotificationsStore()
const hovered = ref(false)
const focused = ref(false)
const paused = computed(() => hovered.value || focused.value)
watch(paused, (isPaused) => {
  if (isPaused) notifications.pause()
  else notifications.resume()
})
const onFocusOut = (event: FocusEvent) => {
  const root = event.currentTarget as HTMLElement | null
  // Focus moving between the buttons of the same toast is not leaving it.
  if (!root?.contains(event.relatedTarget as Node | null)) focused.value = false
}

// Same palette as the mobile app's toast: dark neutral for info and success
// (green stays reserved), red only for errors.
const variantClasses = computed(() =>
  variant === 'error' ? 'bg-red-700 text-white' : 'bg-neutral-900 text-white',
)

const progressBarClass = 'bg-white/70'

const close = () => {
  visible.value = false
  if (cookieConsent) {
    localStorage.setItem('cookiesAccepted', 'true')
  }
  emit('close')
}

const invokeAction = () => {
  action?.handler()
  close()
}

onMounted(async () => {
  // For cookie consent, only show if not already accepted.
  if (cookieConsent && !localStorage.getItem('cookiesAccepted')) {
    visible.value = true
  }
  if (!cookieConsent) {
    visible.value = true
    if (variant === 'error') hapticNotification('Error')
    else if (variant === 'success') hapticNotification('Success')
    // A toast that replaced the one being read starts with its clock held (the pause outlives the replacement). If the pointer or focus is on this new toast, it keeps the hold; if not, the clock runs.
    await nextTick()
    if (!notifications.isPaused()) return
    const root = rootRef.value
    if (root?.matches(':hover')) hovered.value = true
    else if (root?.matches(':focus-within')) focused.value = true
    else notifications.resume()
  }
})
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition:
    transform 0.35s ease,
    opacity 0.35s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
.slide-up-enter-to,
.slide-up-leave-from {
  transform: translateY(0);
  opacity: 1;
}

.notification-bar {
  /* Above the fixed bottom bars (their height is published by useBottomBarOffset), else above the safe area */
  /* The offset is capped (an open cart drawer is taller than most screens would allow) so the toast never leaves the viewport */
  bottom: min(
    calc(var(--bottom-bar-h, env(safe-area-inset-bottom, 0px)) + 1rem),
    calc(100dvh - 8rem)
  );
}

.progress-bar {
  width: 100%;
  animation: toast-progress linear forwards;
}

@keyframes toast-progress {
  from {
    width: 100%;
  }
  to {
    width: 0;
  }
}
</style>
