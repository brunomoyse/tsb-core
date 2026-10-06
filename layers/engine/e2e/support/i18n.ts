import { type Page, expect } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import type { Brand } from './test'
import type { Locale } from './locale'
import { fileURLToPath } from 'node:url'

/*
 * Reading the apps' own message files from a spec, and the "no raw key" guard.
 *
 * Messages are `layers/engine/locales/<locale>.json` merged with the brand's `apps/<brand>/locales/<locale>.json`
 * (the brand wins), exactly what the build bundles. A spec that wants "the login title in Dutch" asks `message()`
 * instead of hard-coding the Dutch, so it follows a copy change and still proves the right language is on screen.
 */

interface Tree {
  [key: string]: string | Tree
}

const fromRoot = (path: string) => fileURLToPath(new URL(`../../../../${path}`, import.meta.url))

const readTree = (path: string): Tree =>
  existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as Tree) : {}

const merge = (base: Tree, over: Tree): Tree => {
  const out: Tree = { ...base }
  for (const [key, value] of Object.entries(over)) {
    const current = out[key]
    out[key] =
      typeof value === 'object' && typeof current === 'object' ? merge(current, value) : value
  }
  return out
}

const cache = new Map<string, Tree>()

export function messages(brand: Brand, locale: Locale): Tree {
  const id = `${brand}/${locale}`
  let tree = cache.get(id)
  if (!tree) {
    tree = merge(
      readTree(fromRoot(`layers/engine/locales/${locale}.json`)),
      readTree(fromRoot(`apps/${brand}/locales/${locale}.json`)),
    )
    cache.set(id, tree)
  }
  return tree
}

/** The message at `key` (dotted path), `__BRAND__` replaced by the brand's name and `{param}`s filled in. */
export function message(
  brand: Brand,
  locale: Locale,
  key: string,
  params: Record<string, string | number> = {},
): string {
  let node: string | Tree | undefined = messages(brand, locale)
  for (const part of key.split('.')) node = typeof node === 'object' ? node[part] : undefined
  if (typeof node !== 'string') throw new Error(`no message ${key} in ${brand}/${locale}`)
  const { brandName } = messages(brand, locale)
  let text = node.replaceAll('__BRAND__', typeof brandName === 'string' ? brandName : '')
  for (const [name, value] of Object.entries(params))
    text = text.replaceAll(`{${name}}`, String(value))
  // A plural message ("1 article | {count} articles") is not resolved here: callers pass plain ones.
  return text
}

/*
 * Anything on the page that is a translation key or a template left unfilled, instead of words:
 *  - a key path such as `checkout.authStep.heading` (the top-level names come from the message files, so an unrelated
 *    dotted word is never a candidate); vue-i18n prints the key itself when a message is missing everywhere,
 *  - an interpolation placeholder `{count}` that was never replaced,
 *  - `undefined`, `NaN` or `[object Object]` where a value was expected.
 * Scans the text nodes and the attributes a customer reads or a screen reader announces.
 */
export function untranslatedText(page: Page, brand: Brand): Promise<string[]> {
  const namespaces = Object.keys(messages(brand, 'fr')).filter((name) => /^[a-z]\w*$/iu.test(name))
  return page.evaluate((names) => {
    const key = new RegExp(
      `(?<![\\w@/.:-])(?:${names.join('|')})(?:\\.[A-Za-z][A-Za-z0-9_]*)+`,
      'gu',
    )
    const leftovers = /\{[a-zA-Z_]\w*\}|\[object Object\]|\bundefined\b|\bNaN\b/gu
    const found = new Set<string>()
    const scan = (text: string, where: string) => {
      for (const match of text.matchAll(key)) found.add(`${where}: ${match[0]}`)
      for (const match of text.matchAll(leftovers)) found.add(`${where}: ${match[0]}`)
    }
    const skip = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'])
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) =>
        node.parentElement && skip.has(node.parentElement.tagName)
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT,
    })
    for (let node = walker.nextNode(); node; node = walker.nextNode())
      scan(node.textContent ?? '', 'text')
    for (const element of document.body.querySelectorAll(
      '[placeholder],[aria-label],[title],[alt]',
    ))
      for (const attribute of ['placeholder', 'aria-label', 'title', 'alt'])
        scan(element.getAttribute(attribute) ?? '', attribute)
    return [...found]
  }, namespaces)
}

/** Fails, naming the page, when a raw key or an unfilled template is on screen. */
export async function expectNoUntranslatedText(page: Page, brand: Brand, label = page.url()) {
  expect(await untranslatedText(page, brand), `raw keys or templates on ${label}`).toEqual([])
}
