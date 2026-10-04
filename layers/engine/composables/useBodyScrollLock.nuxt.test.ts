// useBodyScrollLock / lockBodyScroll: the page cannot scroll while a modal is open; nested locks restore exactly what
// the first one saved; nothing happens during SSR.
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import { nextTick, ref } from 'vue'
import { lockBodyScroll, useBodyScrollLock } from '#engine/composables/useBodyScrollLock'
import { setFlags } from '../../../test/flags'
import { mountComposable } from '../../../test/helpers/mountComposable'

beforeEach(() => {
  document.body.style.overflow = ''
})
afterEach(() => {
  document.body.style.overflow = ''
})

describe('lockBodyScroll', () => {
  it('hides the overflow and restores the original inline value on release', () => {
    document.body.style.overflow = 'scroll'
    const release = lockBodyScroll()
    expect(document.body.style.overflow).toBe('hidden')
    release()
    expect(document.body.style.overflow).toBe('scroll')
  })

  it('nested locks: the page stays locked until the last one is released, then restores the first saved value', () => {
    document.body.style.overflow = 'auto'
    const modal = lockBodyScroll()
    const lightbox = lockBodyScroll()
    lightbox()
    expect(document.body.style.overflow).toBe('hidden')
    modal()
    expect(document.body.style.overflow).toBe('auto')
  })

  it('releasing twice does not unlock somebody else’s lock', () => {
    const first = lockBodyScroll()
    const second = lockBodyScroll()
    first()
    first()
    expect(document.body.style.overflow).toBe('hidden')
    second()
    expect(document.body.style.overflow).toBe('')
  })

  it('does nothing on the server and returns a harmless release', () => {
    setFlags({ server: true })
    const release = lockBodyScroll()
    expect(document.body.style.overflow).toBe('')
    expect(release()).toBeUndefined()
    expect(document.body.style.overflow).toBe('')
  })
})

describe('useBodyScrollLock', () => {
  it('follows the reactive flag', async () => {
    const open = ref(false)
    mountComposable(() => {
      useBodyScrollLock(open)
    })
    expect(document.body.style.overflow).toBe('')
    open.value = true
    await nextTick()
    expect(document.body.style.overflow).toBe('hidden')
    open.value = false
    await nextTick()
    expect(document.body.style.overflow).toBe('')
  })

  it('locks immediately when already active, accepts a getter, and unlocks on unmount', () => {
    const { unmount } = mountComposable(() => {
      useBodyScrollLock(() => true)
    })
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('two components lock independently: the page unlocks when the last one unmounts', () => {
    const a = mountComposable(() => {
      useBodyScrollLock(true)
    })
    const b = mountComposable(() => {
      useBodyScrollLock(true)
    })
    a.unmount()
    expect(document.body.style.overflow).toBe('hidden')
    b.unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('unmounting while inactive leaves the page alone', () => {
    document.body.style.overflow = 'scroll'
    const { unmount } = mountComposable(() => {
      useBodyScrollLock(false)
    })
    unmount()
    expect(document.body.style.overflow).toBe('scroll')
  })

  it('does nothing on the server', async () => {
    setFlags({ server: true })
    const open = ref(true)
    mountComposable(() => {
      useBodyScrollLock(open)
    })
    await nextTick()
    expect(document.body.style.overflow).toBe('')
  })
})
