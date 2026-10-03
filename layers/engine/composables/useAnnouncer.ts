import { useState } from '#imports'

/*
 * One way to say something to a screen reader without showing it (audit PR 3.6, A7).
 *
 * The text is written into the persistent sr-only live region of <ToastAnnouncer> (mounted in both layouts): a
 * live region only announces text written into it AFTER it exists, so a message must never be rendered together
 * with its own region. `seq` makes the same sentence said twice in a row (a stepper pressed twice, a status that
 * goes back and forth) announced twice. Client-only in practice: nothing calls it during SSR, and the region
 * itself mounts after hydration.
 */
export interface Announcement {
  message: string
  /** Bumped on every call, so identical messages still trigger the watcher. */
  seq: number
}

export function useAnnouncer() {
  const state = useState<Announcement>('a11y-announcement', () => ({ message: '', seq: 0 }))

  /** Polite announcement: waits for the screen reader to finish what it is saying. */
  const announce = (message: string): void => {
    if (!message) return
    state.value = { message, seq: state.value.seq + 1 }
  }

  return { announcement: state, announce }
}
