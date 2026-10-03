#!/usr/bin/env node
/*
 * Fails on hard-coded restaurant phone numbers.
 *
 * Both brands share templates that were copy-pasted between apps, and a literal number in one
 * of them ended up dialling the wrong restaurant (YGF's order-completed page called Tokyo, and
 * an extra digit in an address hint dialled nothing). The number lives in each app's brand.ts:
 *  - templates use `brand.phone` for display and `telHref(brand.phone)` (#engine/utils/phone)
 *    for the `tel:` link;
 *  - locale strings use the `__PHONE__` token, which i18n.config.ts replaces with brand.phone.
 *
 * Flagged: a literal `tel:+…` / `tel:0…` or a `+32` number in any .vue or .ts file, and a
 * Belgian-formatted number (`+32 4 222 98 88`, `04 222 98 88`) in any locale or .ts file. A
 * `tel:` link built from user data (`tel:${…}`) is fine. The only files allowed to hold a
 * number are the per-app `brand.ts` and the `phone.ts` helper (whose doc comments cite examples).
 */

import { readdir, readFile } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const roots = [join(repoRoot, 'layers/engine'), join(repoRoot, 'apps')]
const skipDirs = new Set(['node_modules', '.nuxt', '.output', '.data'])
// Repo-relative paths allowed to contain phone numbers.
const allowedFiles = [/^apps\/[^/]+\/brand\.ts$/u, /^layers\/engine\/utils\/phone\.ts$/u]

const telLiteral = /tel:[+0]|\+32\s?\d/u
// Spaced national or international form; unspaced digit runs would also match SVG path data.
const localeNumber = /(?<![\w.-])(?:\+32 ?|0)\d{1,2} \d{3} \d{2} \d{2}(?!\d)/u

async function* walk(dir) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entries) {
    if (skipDirs.has(e.name)) continue
    const p = join(dir, e.name)
    if (e.isDirectory()) yield* walk(p)
    else yield p
  }
}

const problems = []
for (const root of roots) {
  for await (const file of walk(root)) {
    const ext = extname(file)
    const isLocale = ext === '.json' && file.includes(`${join('locales', '')}`)
    const isCode = ext === '.vue' || ext === '.ts'
    if (!isCode && !isLocale) continue
    const rel = relative(repoRoot, file)
    if (allowedFiles.some((re) => re.test(rel))) continue
    const lines = (await readFile(file, 'utf8')).split('\n')
    lines.forEach((text, i) => {
      const hit =
        (isCode && (telLiteral.test(text) || localeNumber.test(text))) ||
        (isLocale && localeNumber.test(text))
      if (hit) {
        problems.push(`${rel}:${i + 1}  ${text.trim().slice(0, 120)}`)
      }
    })
  }
}

if (problems.length) {
  console.error(`hardcoded-phone: ${problems.length} hard-coded phone number(s):\n`)
  for (const p of problems) console.error(`  ${p}`)
  console.error(
    '\nFix: use brand.phone + telHref(brand.phone) in templates, or the __PHONE__ token in locale strings.',
  )
  process.exit(1)
}
console.log('hardcoded-phone: no hard-coded phone numbers ✓')
