// useFocusTrap: real DOM focus behaviour (happy-dom): initial focus, Tab/Shift+Tab cycling, focus pulled back from outside,
// escape handling for the topmost trap only, companions, and focus restore on deactivation / unmount.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { nextTick, ref } from 'vue'
import { type FocusTrapOptions, useFocusTrap } from '#engine/composables/useFocusTrap'
import { mountComposable } from '../../../test/helpers/mountComposable'

interface Tab {
  shiftKey?: boolean
}

/** A dispatched keydown on the active element (what the browser does), returns whether it was default-prevented. */
function press(
  key: string,
  init: Tab = {},
  target: EventTarget = document.activeElement ?? document.body,
) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  return event
}

function buttons(parent: HTMLElement, ...labels: string[]) {
  return labels.map((label) => {
    const b = document.createElement('button')
    b.textContent = label
    parent.append(b)
    return b
  })
}

let host: HTMLElement
let outside: HTMLButtonElement
const cleanups: (() => void)[] = []

/** Mounts a trap on `container`; `options` may be a getter so tests can reference elements created afterwards. */
async function trap(container: HTMLElement | null, options: FocusTrapOptions = {}) {
  const containerRef = ref<HTMLElement | null>(null)
  const mounted = mountComposable(() => {
    useFocusTrap(containerRef, options)
  })
  cleanups.push(mounted.unmount)
  containerRef.value = container
  await nextTick()
  return { containerRef, ...mounted }
}

beforeEach(() => {
  document.body.innerHTML = ''
  host = document.createElement('div')
  outside = document.createElement('button')
  outside.textContent = 'outside'
  document.body.append(outside, host)
  outside.focus()
})

afterEach(() => {
  while (cleanups.length) cleanups.pop()!()
})

describe('activation', () => {
  it('moves focus to the first focusable element and skips disabled / tabindex=-1 / inert ones', async () => {
    const disabled = document.createElement('button')
    disabled.disabled = true
    const skipped = document.createElement('div')
    skipped.tabIndex = -1
    host.append(disabled, skipped)
    const [first, second] = buttons(host, 'first', 'second')
    await trap(host)
    expect(document.activeElement).toBe(first)
    expect(document.activeElement).not.toBe(second)
  })

  it('focuses initialFocus when it gives an element', async () => {
    const [, second] = buttons(host, 'first', 'second')
    await trap(host, { initialFocus: () => second })
    expect(document.activeElement).toBe(second)
  })

  it('falls back to the first focusable when initialFocus gives nothing', async () => {
    const [first] = buttons(host, 'first', 'second')
    await trap(host, { initialFocus: () => null })
    expect(document.activeElement).toBe(first)
  })

  it('leaves focus alone when the container has nothing focusable', async () => {
    await trap(host)
    expect(document.activeElement).toBe(outside)
  })

  it('does nothing while there is no container, and activates when it appears', async () => {
    const containerRef = ref<HTMLElement | null>(null)
    const mounted = mountComposable(() => {
      useFocusTrap(containerRef)
    })
    cleanups.push(mounted.unmount)
    await nextTick()
    expect(document.activeElement).toBe(outside)
    const [first] = buttons(host, 'first')
    containerRef.value = host
    await nextTick()
    expect(document.activeElement).toBe(first)
  })

  it('does not activate twice when the container is replaced by another element', async () => {
    const [first] = buttons(host, 'first')
    const { containerRef } = await trap(host)
    const other = document.createElement('div')
    const [otherFirst] = buttons(other, 'other')
    document.body.append(other)
    containerRef.value = other
    await nextTick()
    // Already active: focus is not stolen again, and the first activation still owns the restore target.
    expect(document.activeElement).toBe(first)
    expect(otherFirst).not.toBe(document.activeElement)
    // The trap now guards the new container: the next Tab, from outside it, is pulled into it.
    expect(press('Tab').defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(otherFirst)
  })

  it('ignores an element that is not visible (display: none)', async () => {
    const [hidden, shown] = buttons(host, 'hidden', 'shown')
    hidden!.style.display = 'none'
    await trap(host)
    expect(document.activeElement).toBe(shown)
  })

  it('ignores an element inside an inert subtree', async () => {
    const inertBox = document.createElement('div')
    inertBox.setAttribute('inert', '')
    const [inside] = buttons(inertBox, 'inert child')
    host.append(inertBox)
    const [reachable] = buttons(host, 'reachable')
    await trap(host)
    expect(document.activeElement).toBe(reachable)
    expect(document.activeElement).not.toBe(inside)
  })
})

describe('Tab cycling', () => {
  it('Tab on the last element wraps to the first', async () => {
    const [first, , last] = buttons(host, 'a', 'b', 'c')
    await trap(host)
    last!.focus()
    const event = press('Tab')
    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(first)
  })

  it('Shift+Tab on the first element wraps to the last', async () => {
    const [first, , last] = buttons(host, 'a', 'b', 'c')
    await trap(host)
    expect(document.activeElement).toBe(first)
    const event = press('Tab', { shiftKey: true })
    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(last)
  })

  it('Shift+Tab on the container itself wraps to the last', async () => {
    const [, , last] = buttons(host, 'a', 'b', 'c')
    host.tabIndex = -1
    await trap(host)
    host.focus()
    press('Tab', { shiftKey: true })
    expect(document.activeElement).toBe(last)
  })

  it('leaves Tab in the middle of the dialog to the browser', async () => {
    const [, middle] = buttons(host, 'a', 'b', 'c')
    await trap(host)
    middle!.focus()
    expect(press('Tab').defaultPrevented).toBe(false)
    expect(press('Tab', { shiftKey: true }).defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(middle)
  })

  it('pulls focus back in when it is outside (backdrop click leaves it on body): Tab to the first, Shift+Tab to the last', async () => {
    const [first, , last] = buttons(host, 'a', 'b', 'c')
    await trap(host)
    ;(document.activeElement as HTMLElement).blur()
    expect(document.activeElement).toBe(document.body)
    expect(press('Tab').defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(first)
    outside.focus()
    press('Tab', { shiftKey: true })
    expect(document.activeElement).toBe(last)
  })

  it('does not interfere with other keys', async () => {
    buttons(host, 'a', 'b')
    await trap(host)
    expect(press('Enter').defaultPrevented).toBe(false)
    expect(press('a').defaultPrevented).toBe(false)
  })

  it('does nothing when no element is focusable any more', async () => {
    const [only] = buttons(host, 'only')
    await trap(host)
    only!.disabled = true
    outside.focus()
    expect(press('Tab').defaultPrevented).toBe(false)
  })

  it('companions outside the container are part of the cycle', async () => {
    const [first] = buttons(host, 'dialog button')
    const toast = document.createElement('div')
    const [undo] = buttons(toast, 'undo')
    document.body.append(toast)
    await trap(host, { companions: () => [toast] })
    // Forward from the last dialog element reaches the companion, and from the companion wraps to the first.
    expect(document.activeElement).toBe(first)
    undo!.focus()
    expect(press('Tab').defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(first)
    first!.focus()
    press('Tab', { shiftKey: true })
    expect(document.activeElement).toBe(undo)
    // Focus inside the companion is "inside": not pulled back in.
    expect(host.contains(undo!)).toBe(false)
  })
})

describe('nesting', () => {
  it('only the topmost trap handles Tab; the lower one resumes when it is gone', async () => {
    const lower = document.createElement('div')
    const upper = document.createElement('div')
    document.body.append(lower, upper)
    const [lowerA, lowerB] = buttons(lower, 'la', 'lb')
    const [upperA, upperB] = buttons(upper, 'ua', 'ub')
    await trap(lower)
    const topmost = await trap(upper)
    expect(document.activeElement).toBe(upperA)
    upperB!.focus()
    press('Tab')
    expect(document.activeElement).toBe(upperA)
    topmost.unmount()
    lowerB!.focus()
    press('Tab')
    expect(document.activeElement).toBe(lowerA)
  })
})

describe('Escape', () => {
  it('without onEscape the trap does not listen to Escape', async () => {
    buttons(host, 'a')
    await trap(host)
    const listener = vi.fn()
    document.addEventListener('keydown', listener)
    const event = press('Escape')
    document.removeEventListener('keydown', listener)
    expect(event.defaultPrevented).toBe(false)
    expect(listener).toHaveBeenCalledOnce()
  })

  it('swallows Escape (capture, stopImmediatePropagation) and calls onEscape', async () => {
    buttons(host, 'a')
    const onEscape = vi.fn()
    await trap(host, { onEscape })
    const modalHandler = vi.fn()
    document.addEventListener('keydown', modalHandler)
    const event = press('Escape')
    document.removeEventListener('keydown', modalHandler)
    expect(onEscape).toHaveBeenCalledOnce()
    expect(event.defaultPrevented).toBe(true)
    expect(modalHandler).not.toHaveBeenCalled()
  })

  it('ignores other keys', async () => {
    buttons(host, 'a')
    const onEscape = vi.fn()
    await trap(host, { onEscape })
    press('Enter')
    expect(onEscape).not.toHaveBeenCalled()
  })

  it('only the topmost trap gets Escape (a lightbox over a modal closes alone)', async () => {
    const lower = document.createElement('div')
    const upper = document.createElement('div')
    document.body.append(lower, upper)
    buttons(lower, 'l')
    buttons(upper, 'u')
    const lowerEscape = vi.fn()
    const upperEscape = vi.fn()
    await trap(lower, { onEscape: lowerEscape })
    await trap(upper, { onEscape: upperEscape })
    press('Escape')
    expect(upperEscape).toHaveBeenCalledOnce()
    expect(lowerEscape).not.toHaveBeenCalled()
  })

  it('an Escape typed inside a companion belongs to the companion', async () => {
    buttons(host, 'a')
    const toast = document.createElement('div')
    const [undo] = buttons(toast, 'undo')
    document.body.append(toast)
    const onEscape = vi.fn()
    await trap(host, { onEscape, companions: () => [toast] })
    const event = press('Escape', {}, undo)
    expect(onEscape).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
    // ...but Escape elsewhere still closes the dialog.
    press('Escape')
    expect(onEscape).toHaveBeenCalledOnce()
  })

  it('stops listening after deactivation', async () => {
    buttons(host, 'a')
    const onEscape = vi.fn()
    const { containerRef } = await trap(host, { onEscape })
    containerRef.value = null
    await nextTick()
    press('Escape')
    expect(onEscape).not.toHaveBeenCalled()
  })
})

describe('deactivation', () => {
  it('restores focus to the element focused before activation', async () => {
    buttons(host, 'a')
    const { containerRef } = await trap(host)
    expect(document.activeElement).not.toBe(outside)
    containerRef.value = null
    await nextTick()
    expect(document.activeElement).toBe(outside)
  })

  it('restores focus on unmount', async () => {
    buttons(host, 'a')
    const { unmount } = await trap(host)
    unmount()
    expect(document.activeElement).toBe(outside)
  })

  it('returnFocus gives another target', async () => {
    buttons(host, 'a')
    const other = document.createElement('button')
    document.body.append(other)
    const { containerRef } = await trap(host, { returnFocus: () => other })
    containerRef.value = null
    await nextTick()
    expect(document.activeElement).toBe(other)
  })

  it('returnFocus false leaves focus where it is', async () => {
    const [first] = buttons(host, 'a')
    const { containerRef } = await trap(host, { returnFocus: () => false })
    containerRef.value = null
    await nextTick()
    expect(document.activeElement).toBe(first)
  })

  it('returnFocus returning nothing falls back to the previously focused element', async () => {
    buttons(host, 'a')
    const { containerRef } = await trap(host, { returnFocus: () => undefined })
    containerRef.value = null
    await nextTick()
    expect(document.activeElement).toBe(outside)
  })

  it('does not focus a restore target that left the DOM', async () => {
    buttons(host, 'a')
    const { containerRef } = await trap(host)
    const focusSpy = vi.spyOn(outside, 'focus')
    outside.remove()
    containerRef.value = null
    await nextTick()
    expect(focusSpy).not.toHaveBeenCalled()
  })

  it('does not run twice (a second unmount after the container was removed is harmless)', async () => {
    buttons(host, 'a')
    const { containerRef, unmount } = await trap(host)
    containerRef.value = null
    await nextTick()
    outside.blur()
    unmount()
    expect(document.activeElement).toBe(document.body)
  })

  it('stops handling Tab after deactivation', async () => {
    const [first, , last] = buttons(host, 'a', 'b', 'c')
    const { containerRef } = await trap(host)
    containerRef.value = null
    await nextTick()
    last!.focus()
    expect(press('Tab').defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(last)
    expect(first).toBeTruthy()
  })
})

describe('without checkVisibility', () => {
  it('falls back to getClientRects', async () => {
    const [a] = buttons(host, 'a')
    const proto = HTMLElement.prototype as unknown as { checkVisibility?: unknown }
    const original = proto.checkVisibility
    proto.checkVisibility = undefined
    const rects = vi.spyOn(a!, 'getClientRects')
    try {
      rects.mockReturnValue([] as unknown as DOMRectList)
      await trap(host)
      expect(document.activeElement).toBe(outside)
      rects.mockReturnValue([{}] as unknown as DOMRectList)
      press('Tab')
      expect(document.activeElement).toBe(a)
    } finally {
      proto.checkVisibility = original
    }
  })
})
