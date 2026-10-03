import { type MaybeRefOrGetter, onBeforeUnmount, toValue, watch } from 'vue'

/*
 * Page scroll lock for modals, drawers and overlays. Locks nest (a lightbox over a product modal): the first
 * one saves the body's inline `overflow`, the last one to release restores exactly that value, so closing the
 * lightbox does not unlock the page under the modal and nothing resets a value it did not set (audit A4).
 */
let lockCount = 0
let savedOverflow = ''

export function lockBodyScroll(): () => void {
  if (!import.meta.client) return () => {}
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  lockCount++
  let released = false
  return () => {
    if (released) return
    released = true
    lockCount--
    if (lockCount === 0) document.body.style.overflow = savedOverflow
  }
}

export function useBodyScrollLock(active: MaybeRefOrGetter<boolean>): void {
  if (!import.meta.client) return
  let release: (() => void) | null = null
  const stop = watch(
    () => toValue(active),
    (on) => {
      release?.()
      release = on ? lockBodyScroll() : null
    },
    { immediate: true },
  )
  onBeforeUnmount(() => {
    stop()
    release?.()
    release = null
  })
}
