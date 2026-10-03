#!/usr/bin/env node
/*
 * Keeps the shared engine layer brand-neutral, so a change made for one brand can't silently
 * restyle or re-route another.
 *
 * Two rules over layers/engine/**\/*.{vue,ts,css}:
 *
 *  1. Theme contract. Engine UI colors come from tokens each brand maps in its tailwind config:
 *     primary-*, neutral-*, tsb-*, the shadcn tokens, white/black. A few hues are allowed because
 *     they carry the same meaning in every brand:
 *       red     errors and destructive actions
 *       amber   warnings
 *       green   success
 *       emerald diet badges and completed states
 *       blue    halal badge
 *     Anything else (gray, slate, orange, rose, ...) and literal hex colors are flagged: they would
 *     look right on one brand and wrong on the other.
 *
 *  2. No brand branching. String literals naming a brand app (derived from apps/*) are flagged.
 *     Brand differences go through BrandConfig flags, props/slots, or an app-level override of the
 *     component at the same path.
 *
 * Opt-out: put `theme-ok: <reason>` or `brand-ok: <reason>` in a comment on the flagged line or
 * within the 3 lines above it, so a comment right before a multi-line tag covers its attributes
 * (e.g. `<!-- theme-ok: Google sign-in button brand colors -->`).
 *
 * Comments are ignored, so explaining a color in prose never trips the check.
 */

import { readdir, readFile } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const engineRoot = join(repoRoot, 'layers/engine')
const exts = new Set(['.vue', '.ts', '.css'])
const skipDirs = new Set(['node_modules', '.nuxt', '.output', 'e2e'])

// Tailwind palette hues outside the contract. `neutral` is contract-mapped; the semantic hues
// listed in the header (red, amber, green, emerald, blue) are allowed.
const forbiddenHues = [
  'slate',
  'gray',
  'zinc',
  'stone',
  'orange',
  'yellow',
  'lime',
  'teal',
  'cyan',
  'sky',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
]
const hueRe = new RegExp(`(?<![\\w-])(?:[a-z]+-)+(${forbiddenHues.join('|')})-\\d{2,3}\\b`, 'gu')
// #rgb, #rgba, #rrggbb, #rrggbbaa preceded by something that can start a color value.
const hexRe = /(?<=[\s[("':,])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/gu

const brandNames = (await readdir(join(repoRoot, 'apps'), { withFileTypes: true }))
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
const brandRe = new RegExp(`['"\`](${brandNames.join('|')})['"\`]`, 'gu')

async function* walk(dir) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entries) {
    const p = join(dir, e.name)
    if (e.isDirectory()) {
      if (!skipDirs.has(e.name)) yield* walk(p)
    } else if (exts.has(extname(p))) yield p
  }
}

// Blank out comments but keep newlines, so line numbers still match the file. Only the opt-out
// markers survive, read separately from the raw lines.
function stripComments(source) {
  const blank = (m) => m.replace(/[^\n]/gu, ' ')
  return source
    .replace(/<!--[\s\S]*?-->/gu, blank)
    .replace(/\/\*[\s\S]*?\*\//gu, blank)
    .replace(/(^|[^:'"`\w])\/\/[^\n]*/gu, (m, lead) => lead + blank(m.slice(lead.length)))
}

const optOutWindow = 3

function isOptedOut(rawLines, lineIdx, marker) {
  const re = new RegExp(`${marker}-ok(?::|\\b)`, 'u')
  return rawLines.slice(Math.max(0, lineIdx - optOutWindow), lineIdx + 1).some((l) => re.test(l))
}

async function checkFile(file) {
  const raw = await readFile(file, 'utf8')
  const rawLines = raw.split('\n')
  const lines = stripComments(raw).split('\n')
  const out = []
  lines.forEach((line, i) => {
    const report = (marker, kind, match) => {
      if (!isOptedOut(rawLines, i, marker))
        out.push({ file: relative(repoRoot, file), line: i + 1, kind, match })
    }
    for (const m of line.matchAll(hueRe)) report('theme', 'hue outside the theme contract', m[0])
    for (const m of line.matchAll(hexRe)) report('theme', 'literal hex color', m[0])
    for (const m of line.matchAll(brandRe)) report('brand', 'brand-specific branch', m[0])
  })
  return out
}

async function main() {
  const violations = []
  for await (const file of walk(engineRoot)) violations.push(...(await checkFile(file)))
  if (violations.length === 0) {
    console.log('engine-boundaries: engine is brand-neutral ✓')
    return
  }
  console.error(`engine-boundaries: ${violations.length} violation(s) in layers/engine:\n`)
  for (const v of violations) console.error(`  ${v.file}:${v.line}  ${v.kind}: ${v.match}`)
  console.error(
    '\nFix: use contract tokens (primary-*, neutral-*, tsb-*) or a semantic hue (red, amber, green,' +
      ' emerald, blue);\nmove brand differences to a BrandConfig flag, a prop/slot, or an app-level' +
      ' override.\nIf it is genuinely brand-neutral, add a `theme-ok: <reason>` / `brand-ok: <reason>`' +
      ' comment.',
  )
  process.exit(1)
}

main().catch((err) => {
  console.error('engine-boundaries: unexpected error', err)
  process.exit(2)
})
