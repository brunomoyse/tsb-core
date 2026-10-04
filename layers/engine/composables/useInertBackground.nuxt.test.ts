// useInertBackground: the page wrapper is inert while a sheet is open (real DOM attribute), restored on close/unmount.
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import { nextTick, ref } from 'vue'
import { useInertBackground } from '#engine/composables/useInertBackground'
import { setFlags } from '../../../test/flags'
import { mountComposable } from '../../../test/helpers/mountComposable'

let root: HTMLElement
beforeEach(() => {
  document.body.innerHTML = '<div data-app-root></div><div id="other"></div>'
  root = document.querySelector('[data-app-root]')!
})
afterEach(() => {
  document.body.innerHTML = ''
})

describe('useInertBackground', () => {
  it('marks the app root inert while active and clears it when closed', async () => {
    const open = ref(false)
    mountComposable(() => {
      useInertBackground(open)
    })
    expect(root.hasAttribute('inert')).toBe(false)
    open.value = true
    await nextTick()
    expect(root.hasAttribute('inert')).toBe(true)
    open.value = false
    await nextTick()
    expect(root.hasAttribute('inert')).toBe(false)
  })

  it('applies immediately when it starts active (after the post flush) and only to the selector', async () => {
    mountComposable(() => {
      useInertBackground(() => true)
    })
    await nextTick()
    expect(root.hasAttribute('inert')).toBe(true)
    expect(document.getElementById('other')!.hasAttribute('inert')).toBe(false)
  })

  it('takes a custom selector', async () => {
    mountComposable(() => {
      useInertBackground(true, '#other')
    })
    await nextTick()
    expect(document.getElementById('other')!.hasAttribute('inert')).toBe(true)
    expect(root.hasAttribute('inert')).toBe(false)
  })

  it('restores the page on unmount even while open, and stops reacting afterwards', async () => {
    const open = ref(true)
    const { unmount } = mountComposable(() => {
      useInertBackground(open)
    })
    await nextTick()
    unmount()
    expect(root.hasAttribute('inert')).toBe(false)
    open.value = false
    open.value = true
    await nextTick()
    expect(root.hasAttribute('inert')).toBe(false)
  })

  it('does nothing on the server', async () => {
    setFlags({ server: true })
    mountComposable(() => {
      useInertBackground(true)
    })
    await nextTick()
    expect(root.hasAttribute('inert')).toBe(false)
  })
})
