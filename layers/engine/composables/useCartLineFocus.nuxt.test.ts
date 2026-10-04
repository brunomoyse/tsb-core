// useCartLineFocus: keyboard focus must not fall on <body> when the cart line it was on goes away.
// Real DOM (happy-dom): a surface with cart lines, each with a remove button; the "action" removes lines from the DOM.
// Run: `vp test run layers/engine/composables/useCartLineFocus.nuxt.test.ts`.
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import { useCartLineFocus } from '#engine/composables/useCartLineFocus'

let root: HTMLElement
let fallback: HTMLElement

/** Three lines "l0".."l2", each with a "−" button and a Remove button. */
const buildSurface = (count = 3) => {
  document.body.innerHTML = ''
  root = document.createElement('div')
  fallback = document.createElement('button')
  fallback.id = 'fallback'
  for (let i = 0; i < count; i++) {
    const line = document.createElement('div')
    line.setAttribute('data-cart-line', '')
    line.id = `l${i}`
    const dec = document.createElement('button')
    dec.id = `dec${i}`
    const remove = document.createElement('button')
    remove.id = `rm${i}`
    remove.setAttribute('data-cart-remove', '')
    line.append(dec, remove)
    root.append(line)
  }
  document.body.append(root, fallback)
}
const removeLine = (index: number) => root.querySelector(`#l${index}`)?.remove()
const focused = () => document.activeElement?.id

beforeEach(() => {
  buildSurface()
})
afterEach(() => {
  document.body.innerHTML = ''
})

const focusOn = (id: string) => {
  ;(document.getElementById(id) as HTMLElement).focus()
}
const make = (options?: Parameters<typeof useCartLineFocus>[0]) =>
  useCartLineFocus(options ?? { container: () => root, fallback: () => fallback }).keepFocus

describe('keepFocus', () => {
  it('moves focus to the Remove button of the line that took the removed one’s place', async () => {
    focusOn('rm1')
    await make()(() => removeLine(1))
    expect(focused()).toBe('rm2')
  })

  it('removing the last line puts focus on the new last line (clamped)', async () => {
    focusOn('rm2')
    await make()(() => removeLine(2))
    expect(focused()).toBe('rm1')
  })

  it('works from any control inside the line, not only the Remove button', async () => {
    focusOn('dec0')
    await make()(() => removeLine(0))
    expect(focused()).toBe('rm1')
  })

  it('when the cart becomes empty, focus goes to the surface fallback (empty-state link, close button)', async () => {
    buildSurface(1)
    focusOn('rm0')
    await make()(() => removeLine(0))
    expect(focused()).toBe('fallback')
  })

  it('when the whole surface goes with the last line (the side cart), the fallback gets focus, not a detached line', async () => {
    buildSurface(1)
    // The surface itself is detached together with its only line.
    const surface = root
    focusOn('rm0')
    await make({ container: () => surface, fallback: () => fallback })(() => {
      surface.remove()
    })
    expect(focused()).toBe('fallback')
  })

  it('leaves focus alone when it is still on a live element (the "−" of a line that has several units)', async () => {
    focusOn('dec1')
    await make()(() => undefined)
    expect(focused()).toBe('dec1')
  })

  it('leaves focus alone when it was not inside a cart line', async () => {
    focusOn('fallback')
    await make()(() => removeLine(0))
    expect(focused()).toBe('fallback')
  })

  it('leaves focus alone when it was inside the surface but outside every line', async () => {
    const heading = document.createElement('button')
    heading.id = 'heading'
    root.prepend(heading)
    focusOn('heading')
    await make()(() => removeLine(0))
    expect(focused()).toBe('heading')
  })

  it('without a surface it just runs the action', async () => {
    let ran = false
    await make({ container: () => null, fallback: () => null })(() => {
      ran = true
    })
    expect(ran).toBe(true)
    const undef = make({ container: () => undefined, fallback: () => undefined })
    await undef(() => undefined)
  })

  it('a line without a Remove button, and no fallback, is survived (focus is simply left where the browser put it)', async () => {
    root.querySelector('#rm2')?.removeAttribute('data-cart-remove')
    focusOn('rm1')
    await make({ container: () => root, fallback: () => null })(() => removeLine(1))
    expect(focused()).not.toBe('rm2')
  })

  it('the action runs before focus is repaired, and its result is what is looked at', async () => {
    const order: string[] = []
    focusOn('rm0')
    await make()(() => {
      order.push('action')
      removeLine(0)
    })
    order.push(`focus:${focused()}`)
    expect(order).toEqual(['action', 'focus:rm1'])
  })
})
