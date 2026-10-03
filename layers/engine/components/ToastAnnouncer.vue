<template>
  <!-- Always mounted and visually hidden: a live region only announces text that is written into it AFTER it exists, so the toast itself (mounted together with its text, and with a fresh key per toast) cannot be the live region. -->
  <div class="sr-only" data-testid="toast-announcer">
    <div role="status" aria-live="polite" aria-atomic="true" data-testid="toast-announcer-polite">
      {{ polite }}
    </div>
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      data-testid="toast-announcer-assertive"
    >
      {{ assertive }}
    </div>
    <!-- Everything else the page has to say (cart changes, order status): useAnnouncer(). A region of its own, so a toast raised at the same moment does not overwrite it. -->
    <div role="status" aria-live="polite" aria-atomic="true" data-testid="announcer-polite">
      {{ status }}
    </div>
  </div>
</template>

<script lang="ts" setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import { useAnnouncer } from '#engine/composables/useAnnouncer'
import { useCartAnnouncements } from '#engine/composables/useCartAnnouncements'
import { useNotificationsStore } from '#engine/stores/notifications'

/*
 * Screen-reader announcement of the toast on screen (audit PR 2.6 review). Errors go to the assertive
 * region, everything else to the polite one. The text is cleared and then set on the next tick, so the
 * same message shown twice in a row is announced twice. The visual NotificationBar carries no live role.
 */
const notifications = useNotificationsStore()
const polite = ref('')
const assertive = ref('')
const status = ref('')

const announce = async (): Promise<void> => {
  polite.value = ''
  assertive.value = ''
  const { current } = notifications
  if (!current) return
  await nextTick()
  if (current.variant === 'error') assertive.value = current.message
  else polite.value = current.message
}

watch(() => notifications.seq, announce)

/* The useAnnouncer() messages: cleared and then set on the next tick, like the toasts, so a repeated sentence is read again. */
const { announcement } = useAnnouncer()
const say = async (): Promise<void> => {
  status.value = ''
  if (!announcement.value.message) return
  const { message } = announcement.value
  await nextTick()
  status.value = message
}
watch(() => announcement.value.seq, say)
// The cart is described from here on (the component is client-only, so a cart restored from localStorage is never announced).
useCartAnnouncements()
// A toast raised before this component mounted (it is client-only) is announced once it has.
onMounted(announce)
</script>
