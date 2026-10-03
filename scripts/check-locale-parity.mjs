#!/usr/bin/env node
/*
 * Locale checks, run by `npm run lint` and CI.
 *
 * 1. Key parity: fr, en, nl and zh must define exactly the same keys, separately for the engine
 *    layer (layers/engine/locales) and for every app (apps/<app>/locales). A key missing from one
 *    language shows up as a raw key path (or a French fallback) for those customers.
 * 2. Placeholder parity: every language of a key uses the same {placeholders} (a renamed or
 *    dropped {count} / {amount} silently breaks the message).
 * 3. Used keys: every literal `$t('a.b')` / `t('a.b')` call in the engine or an app must resolve
 *    in the French messages (engine + that app). Dynamic keys (`'prefix.' + x`, template strings)
 *    are not checked, and neither are keys that only appear in a call's default-value argument.
 */

import { readdir, readFile } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const LOCALES = ['fr', 'en', 'nl', 'zh']
const failures = []

function flatten(node, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(node)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out)
    else out[key] = v
  }
  return out
}

async function loadLocales(dir) {
  const messages = {}
  for (const l of LOCALES) {
    const file = join(dir, `${l}.json`)
    messages[l] = flatten(JSON.parse(await readFile(file, 'utf8')))
  }
  return messages
}

const placeholders = (value) =>
  typeof value === 'string'
    ? [...new Set([...value.matchAll(/\{(\w+)\}/gu)].map((m) => m[1]))].sort().join(',')
    : ''

function checkParity(label, messages) {
  const all = new Set(LOCALES.flatMap((l) => Object.keys(messages[l])))
  for (const l of LOCALES) {
    const missing = [...all].filter((k) => !(k in messages[l])).sort()
    if (missing.length) {
      failures.push(
        `${label}: ${l} is missing ${missing.length} key(s):\n    ${missing.join('\n    ')}`,
      )
    }
  }
  for (const key of [...all].sort()) {
    const present = LOCALES.filter((l) => key in messages[l])
    const variants = new Set(present.map((l) => placeholders(messages[l][key])))
    if (variants.size > 1) {
      const detail = present.map((l) => `${l}={${placeholders(messages[l][key])}}`).join(' ')
      failures.push(`${label}: placeholders differ for "${key}": ${detail}`)
    }
  }
}

async function* walk(dir) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entries) {
    if (['node_modules', '.nuxt', '.output', 'locales', 'e2e'].includes(e.name)) continue
    const p = join(dir, e.name)
    if (e.isDirectory()) yield* walk(p)
    else if (['.vue', '.ts'].includes(extname(p))) yield p
  }
}

// `$t('a.b')`, `t("a.b", ...)`, `te('a.b')` — the literal must be the whole first argument.
const callPattern =
  /(?<![\w.])(?:\$t|\$tc|t|tc|te)\(\s*(['"`])([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+)\1\s*[,)]/gu

async function checkUsedKeys(label, roots, fr) {
  const known = new Set(Object.keys(fr))
  const isPrefix = (key) => [...known].some((k) => k.startsWith(`${key}.`))
  for (const root of roots) {
    for await (const file of walk(root)) {
      const source = await readFile(file, 'utf8')
      for (const m of source.matchAll(callPattern)) {
        const key = m[2]
        if (known.has(key) || isPrefix(key)) continue
        const line = source.slice(0, m.index).split('\n').length
        failures.push(
          `${label}: "${key}" is used at ${relative(repoRoot, file)}:${line} but is not defined in fr`,
        )
      }
    }
  }
}

const engineDir = join(repoRoot, 'layers/engine')
const engine = await loadLocales(join(engineDir, 'locales'))
checkParity('engine locales', engine)

const apps = (await readdir(join(repoRoot, 'apps'), { withFileTypes: true }))
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort()

for (const app of apps) {
  const appDir = join(repoRoot, 'apps', app)
  const messages = await loadLocales(join(appDir, 'locales'))
  checkParity(`${app} locales`, messages)
  await checkUsedKeys(app, [engineDir, appDir], { ...engine.fr, ...messages.fr })
}

if (failures.length) {
  console.error(`locale-parity: ${failures.length} problem(s)\n`)
  for (const f of failures) console.error(`  ${f}`)
  process.exit(1)
}
console.log(`locale-parity: engine + ${apps.join(', ')} are in sync across ${LOCALES.join('/')} ✓`)
