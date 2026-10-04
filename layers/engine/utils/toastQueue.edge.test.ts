import { describe, expect, it } from 'vite-plus/test'
import { enqueueToast } from './toastQueue'

const toast = (id: number, message: string, group?: string) => ({
  id,
  message,
  variant: 'neutral',
  group,
})

describe('enqueueToast', () => {
  it('a toast of the same group as one that is waiting replaces it in place', () => {
    const state = {
      current: toast(1, 'showing', 'other'),
      queue: [toast(2, 'waiting a', 'removal'), toast(3, 'waiting b', 'x')],
    }
    const result = enqueueToast(state, toast(4, '2 items removed', 'removal'))
    expect(result.queue.map((t) => t.id)).toEqual([4, 3])
    expect(result.current).toBe(state.current)
    expect(result.currentChanged).toBe(false)
    expect(result.restartCurrent).toBe(false)
  })
})
