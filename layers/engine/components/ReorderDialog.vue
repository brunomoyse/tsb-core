<template>
    <Teleport to="body">
        <div
            v-if="prompt"
            class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0"
            data-testid="reorder-dialog-backdrop"
            @click.self="resolve(null)"
            @keydown.esc.stop="resolve(null)"
        >
            <div
                ref="dialogRef"
                role="dialog"
                aria-modal="true"
                aria-labelledby="reorder-dialog-title"
                aria-describedby="reorder-dialog-body"
                data-testid="reorder-dialog"
                class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            >
                <h2 id="reorder-dialog-title" class="text-lg font-semibold text-neutral-900">
                    {{ $t('reorder.confirmTitle') }}
                </h2>
                <p id="reorder-dialog-body" class="mt-2 text-sm text-neutral-600">
                    {{ $t('reorder.confirmBody') }}
                </p>
                <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        data-testid="reorder-cancel"
                        :class="secondaryClass"
                        class="min-h-11 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                        @click="resolve(null)"
                    >
                        {{ $t('common.cancel') }}
                    </button>
                    <button
                        type="button"
                        data-testid="reorder-replace"
                        :class="secondaryClass"
                        class="min-h-11 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                        @click="resolve('replace')"
                    >
                        {{ $t('reorder.replace') }}
                    </button>
                    <button
                        type="button"
                        data-testid="reorder-merge"
                        :class="primaryClass"
                        class="min-h-11 rounded-xl px-4 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                        @click="resolve('merge')"
                    >
                        {{ $t('reorder.add') }}
                    </button>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script lang="ts" setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { useFocusTrap } from '#engine/composables/useFocusTrap'
import { useReorder } from '#engine/composables/useReorder'

/*
 * "Replace your current cart?" (audit M16): the one place a re-order asks before touching a cart
 * that already has lines. State and actions come from `useReorder` (shared via useState), so this is
 * mounted once per layout. Brand-neutral: the layout passes the button colours.
 *
 * The focus trap puts focus on the first button (Cancel) and gives it back to the "Re-order"
 * button on close; Escape and the backdrop cancel; the page does not scroll while it is open.
 */
const {
    primaryClass = 'bg-neutral-900 text-white hover:bg-neutral-700 focus-visible:ring-neutral-900',
    secondaryClass = 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200 focus-visible:ring-ring focus-visible:ring-offset-2',
} = defineProps<{
    primaryClass?: string
    secondaryClass?: string
}>()

const { prompt, resolve } = useReorder()

const dialogRef = ref<HTMLElement | null>(null)
useFocusTrap(dialogRef)

// The page's own overflow value is saved on open and put back on close (and on unmount), not blanked: something else may have set it.
let previousOverflow: string | null = null
const restoreScroll = () => {
    if (previousOverflow === null) return
    document.body.style.overflow = previousOverflow
    previousOverflow = null
}
watch(prompt, (open) => {
    if (!import.meta.client) return
    if (open) {
        if (previousOverflow === null) previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
    } else {
        restoreScroll()
    }
})
onBeforeUnmount(() => {
    if (import.meta.client) restoreScroll()
})
</script>
