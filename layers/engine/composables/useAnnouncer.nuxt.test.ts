// UseAnnouncer: the shared state the sr-only live region reads. The same sentence twice must still be a new event.
import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { clearNuxtState, useState } from '#imports'
import { useAnnouncer } from '#engine/composables/useAnnouncer'

beforeEach(() => {
  useState('a11y-announcement').value = { message: '', seq: 0 }
})

describe('useAnnouncer', () => {
  it('starts silent', () => {
    clearNuxtState('a11y-announcement')
    expect(useAnnouncer().announcement.value).toEqual({ message: '', seq: 0 })
  })

  it('writes the message and bumps seq', () => {
    const { announce, announcement } = useAnnouncer()
    announce('Added to cart')
    expect(announcement.value).toEqual({ message: 'Added to cart', seq: 1 })
  })

  it('announces an identical message twice by changing seq', () => {
    const { announce, announcement } = useAnnouncer()
    announce('Quantity 2')
    const first = announcement.value
    announce('Quantity 2')
    expect(announcement.value.message).toBe('Quantity 2')
    expect(announcement.value.seq).toBe(first.seq + 1)
    expect(announcement.value).not.toBe(first)
  })

  it('ignores an empty message', () => {
    const { announce, announcement } = useAnnouncer()
    announce('hello')
    announce('')
    expect(announcement.value).toEqual({ message: 'hello', seq: 1 })
  })

  it('shares one region between every caller', () => {
    useAnnouncer().announce('from A')
    expect(useAnnouncer().announcement.value.message).toBe('from A')
  })
})
