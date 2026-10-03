<template>
  <div data-testid="load-error" class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
    <!-- The alert is the message alone: announcing the container would read the Retry button out with it. -->
    <p role="alert" class="min-w-0 flex-1 text-sm font-medium">
      <slot>{{ message }}</slot>
    </p>
    <button
      type="button"
      data-testid="load-error-retry"
      :disabled="busy"
      :class="
        buttonClass ??
        'min-h-11 shrink-0 rounded-lg border border-current px-4 text-sm font-semibold hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60'
      "
      @click="emit('retry')"
    >
      {{ $t('common.retry') }}
    </button>
  </div>
</template>

<script lang="ts" setup>
/*
 * A failed load with its way out (audit M7 + M21): the message and a translated Retry button.
 * Brand-neutral: the parent gives the colours through `class` (the root) and `button-class`
 * (replaces the default outline button), the message is the default slot or the `message` prop.
 */
defineProps<{
  message?: string
  /** A retry is in flight: the button is disabled until it ends. */
  busy?: boolean
  buttonClass?: string
}>()

const emit = defineEmits<{ retry: [] }>()
</script>
