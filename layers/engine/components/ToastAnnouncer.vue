<template>
    <!-- Always mounted and visually hidden: a live region only announces text that is written into it AFTER it exists, so the toast itself (mounted together with its text, and with a fresh key per toast) cannot be the live region. -->
    <div class="sr-only" data-testid="toast-announcer">
        <div role="status" aria-live="polite" aria-atomic="true" data-testid="toast-announcer-polite">{{ polite }}</div>
        <div role="alert" aria-live="assertive" aria-atomic="true" data-testid="toast-announcer-assertive">{{ assertive }}</div>
    </div>
</template>

<script lang="ts" setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import { useNotificationsStore } from '#engine/stores/notifications'

/*
 * Screen-reader announcement of the toast on screen (audit PR 2.6 review). Errors go to the assertive
 * region, everything else to the polite one. The text is cleared and then set on the next tick, so the
 * same message shown twice in a row is announced twice. The visual NotificationBar carries no live role.
 */
const notifications = useNotificationsStore()
const polite = ref('')
const assertive = ref('')

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
// A toast raised before this component mounted (it is client-only) is announced once it has.
onMounted(announce)
</script>
