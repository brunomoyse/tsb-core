// UseLanguagePicker: the disclosure state of the language switcher with the real i18n (4 locales) and switchLocalePath.
// Only the analytics beacon (window.umami) is a spy.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { nextTick } from 'vue'
import { useNuxtApp } from '#imports'
import { useLanguagePicker } from '#engine/composables/useLanguagePicker'
import { setFlags } from '../../../test/flags'
import { mountComposableInNuxt } from '../../../test/helpers/mountComposable'

const track = vi.fn()
const i18n = () => useNuxtApp().$i18n as unknown as { locale: { value: string } }
let originalLocale = ''
const cleanups: (() => void)[] = []

async function picker() {
  const mounted = await mountComposableInNuxt(() => useLanguagePicker())
  cleanups.push(mounted.unmount)
  return mounted.result
}

beforeEach(() => {
  track.mockReset()
  ;(window as unknown as { umami: unknown }).umami = { track }
  originalLocale = i18n().locale.value
  i18n().locale.value = 'fr'
})
afterEach(() => {
  while (cleanups.length) cleanups.pop()!()
  i18n().locale.value = originalLocale
  document.body.innerHTML = ''
})

describe('languages and current', () => {
  it('lists the four languages, each named in itself, and marks the active one', async () => {
    const { languages, current } = await picker()
    expect(languages.value.map((l) => [l.code, l.label, l.current])).toEqual([
      ['fr', 'Français', true],
      ['en', 'English', false],
      ['nl', 'Nederlands', false],
      ['zh', '中文', false],
    ])
    expect(current.value).toEqual({ code: 'fr', label: 'Français', short: 'FR' })
  })

  it('each entry links to its own locale path', async () => {
    const { languages } = await picker()
    const targets = Object.fromEntries(languages.value.map((l) => [l.code, l.to]))
    expect(targets.en).toMatch(/^\/en(\/|$)/u)
    expect(targets.zh).toMatch(/^\/zh(\/|$)/u)
    expect(targets.nl).toMatch(/^\/nl(\/|$)/u)
  })

  it('follows a language change', async () => {
    const { languages, current } = await picker()
    i18n().locale.value = 'zh'
    await nextTick()
    expect(current.value.short).toBe('中文')
    expect(languages.value.find((l) => l.current)?.code).toBe('zh')
  })

  it('falls back to French when the locale is not one of the four', async () => {
    const { current } = await picker()
    i18n().locale.value = 'de'
    await nextTick()
    expect(current.value.code).toBe('fr')
  })

  it('gives a unique panel id per picker', async () => {
    // Two pickers in one component (desktop and mobile menus): useId differs between them.
    const mounted = await mountComposableInNuxt(
      () => [useLanguagePicker(), useLanguagePicker()] as const,
    )
    cleanups.push(mounted.unmount)
    const [a, b] = mounted.result
    expect(a.panelId).toMatch(/^language-panel-/u)
    expect(a.panelId).not.toBe(b.panelId)
  })
})

describe('open / close', () => {
  it('toggle opens and closes', async () => {
    const p = await picker()
    p.toggle()
    expect(p.open.value).toBe(true)
    p.toggle()
    expect(p.open.value).toBe(false)
  })

  it('close(true) gives focus back to the button after the DOM settled; plain close does not', async () => {
    const p = await picker()
    const button = document.createElement('button')
    const other = document.createElement('input')
    document.body.append(button, other)
    p.buttonRef.value = button
    other.focus()
    p.toggle()
    p.close()
    await nextTick()
    expect(document.activeElement).toBe(other)
    p.toggle()
    p.close(true)
    await nextTick()
    expect(document.activeElement).toBe(button)
  })

  it('close(true) on a picker that is already closed does not steal focus', async () => {
    const p = await picker()
    const button = document.createElement('button')
    const other = document.createElement('input')
    document.body.append(button, other)
    p.buttonRef.value = button
    other.focus()
    p.close(true)
    await nextTick()
    expect(document.activeElement).toBe(other)
  })
})

describe('choose', () => {
  it('tracks a change of language and closes', async () => {
    const p = await picker()
    p.open.value = true
    p.choose('nl')
    expect(track).toHaveBeenCalledExactlyOnceWith('language_changed', {
      from_locale: 'fr',
      to_locale: 'nl',
    })
    expect(p.open.value).toBe(false)
  })

  it('choosing the current language only closes', async () => {
    const p = await picker()
    p.open.value = true
    p.choose('fr')
    expect(track).not.toHaveBeenCalled()
    expect(p.open.value).toBe(false)
  })
})

describe('dismissal', () => {
  async function attached() {
    const p = await picker()
    const root = document.createElement('div')
    const button = document.createElement('button')
    const link = document.createElement('a')
    root.append(button, link)
    const outside = document.createElement('div')
    document.body.append(root, outside)
    p.rootRef.value = root
    p.buttonRef.value = button
    await nextTick()
    return { p, root, button, link, outside }
  }

  it('Escape inside the picker closes it, focuses the button and stays inside (no bubbling)', async () => {
    const { p, link, button } = await attached()
    const seenAbove = vi.fn()
    document.body.addEventListener('keydown', seenAbove)
    p.open.value = true
    link.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    expect(p.open.value).toBe(false)
    expect(document.activeElement).toBe(button)
    expect(seenAbove).not.toHaveBeenCalled()
    document.body.removeEventListener('keydown', seenAbove)
  })

  it('Escape when closed is left to others (e.g. the mobile menu)', async () => {
    const { link } = await attached()
    const seenAbove = vi.fn()
    document.body.addEventListener('keydown', seenAbove)
    link.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(seenAbove).toHaveBeenCalledOnce()
    document.body.removeEventListener('keydown', seenAbove)
  })

  it('other keys do nothing', async () => {
    const { p, link } = await attached()
    p.open.value = true
    link.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(p.open.value).toBe(true)
  })

  it('a click outside closes it', async () => {
    const { p, outside } = await attached()
    p.open.value = true
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(p.open.value).toBe(false)
  })

  it('a click inside does not', async () => {
    const { p, link } = await attached()
    p.open.value = true
    link.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    link.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(p.open.value).toBe(true)
  })

  it('registers no listeners during SSR (nothing to dismiss, no window)', async () => {
    setFlags({ server: true })
    const p = await picker()
    const root = document.createElement('div')
    document.body.append(root)
    p.rootRef.value = root
    p.open.value = true
    await nextTick()
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(p.open.value).toBe(true)
  })
})
