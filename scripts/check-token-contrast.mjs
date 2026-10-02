#!/usr/bin/env node
/*
 * Contrast gate for the theme contract the engine layer is written against
 * (primary-*, neutral-*, tsb-* surfaces, the brand `--ring` variable, and the few
 * status hues red / amber / green / emerald). Each brand maps those names in its
 * tailwind.config.ts (plus brand.css / main.css for the HSL variables), so the same
 * engine markup can pass in one brand and fail in the other. This reads the real
 * configs and checks, per brand:
 *
 *  - every text colour the engine may use for body, secondary, accent and status text
 *    reaches 4.5:1 (WCAG 1.4.3) on the surfaces it sits on;
 *  - white on a CTA fill (bg-primary-600 / -700) reaches 4.5:1;
 *  - the focus ring (`ring-ring`) reaches 3:1 (WCAG 1.4.11) on every surface.
 *
 * `neutral-300/400/500` and `primary-300/400/500` are deliberately absent: Tokyo Sushi's
 * gray-500 is 4.07:1 on its darkest surface and its red-500 3.76:1 on white. They are
 * decorative steps (separators, empty-state glyphs, hairlines) and must not carry text, so
 * the source scan below also fails on `text-neutral-300|400|500` outside icons/decoration
 * (`<svg`, `aria-hidden`, or a `contrast-ok` comment on the line). Use neutral-600 for
 * secondary text.
 * `node scripts/check-token-contrast.mjs --table` prints every pair.
 */

import { dirname, join, resolve } from 'node:path'
import { readdir, readFile } from 'node:fs/promises'
import { createJiti } from 'jiti'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const jiti = createJiti(import.meta.url, { interopDefault: true })

const lum = (hex) => {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
}
const hslToHex = (h, s, l) => {
    s /= 100; l /= 100
    const k = n => (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return `#${[f(0), f(8), f(4)].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

/** CSS custom properties (`--name: H S% L%`) declared in a brand's stylesheets, last declaration wins. */
const readCssVars = async (appDir) => {
    const vars = {}
    const dir = join(appDir, 'assets/css')
    // Cascade order: Tailwind's neutral shadcn defaults first, the brand's own file last.
    const order = (f) => (f === 'tailwind.css' ? 0 : f === 'brand.css' ? 2 : 1)
    for (const file of (await readdir(dir)).sort((a, b) => order(a) - order(b) || a.localeCompare(b))) {
        if (!file.endsWith('.css')) continue
        const css = (await readFile(join(dir, file), 'utf8')).replace(/\/\*[\s\S]*?\*\//gu, '')
        for (const m of css.matchAll(/--([\w-]+):\s*([^;]+);/gu)) vars[m[1]] = m[2].trim()
    }
    return vars
}

const normalise = (value, vars) => {
    if (typeof value !== 'string') return null
    let v = value.trim()
    const varRef = /^hsl\(var\(--([\w-]+)\)(?:\s*\/\s*<alpha-value>)?\)$/u.exec(v)
    if (varRef) {
        const m = /^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/u.exec(vars[varRef[1]] ?? '')
        return m ? hslToHex(Number(m[1]), Number(m[2]), Number(m[3])) : null
    }
    if (/^#[\da-f]{3}$/iu.test(v)) v = `#${[...v.slice(1)].map(c => c + c).join('')}`
    return /^#[\da-f]{6}$/iu.test(v) ? v.toUpperCase() : null
}

const lookup = (tree, path) => path.split('.').reduce((node, key) => (node && typeof node === 'object' ? node[key] : undefined), tree)

const SURFACES = ['white', 'tsb-one', 'tsb-two', 'tsb-four']
// text colour class -> [which colour key it reads from]; all must reach 4.5:1 on SURFACES.
const TEXT = ['neutral-600', 'neutral-700', 'neutral-800', 'neutral-900',
    'primary-700', 'primary-800', 'red-700', 'amber-800', 'green-800', 'emerald-700']
const FILLS = ['primary-600', 'primary-700']

const apps = (await readdir(join(repoRoot, 'apps'), { withFileTypes: true })).filter(e => e.isDirectory()).map(e => e.name)
const rows = []
const failures = []
for (const app of apps) {
    const appDir = join(repoRoot, 'apps', app)
    let config
    try { config = await jiti.import(join(appDir, 'tailwind.config.ts'), { default: true }) } catch { continue }
    const vars = await readCssVars(appDir)
    const extend = config.theme?.extend ?? {}
    // Tailwind's own default palette for the status hues.
    const { default: palette } = await import('tailwindcss/colors.js').catch(() => ({ default: {} }))
    const color = (type, name) => {
        // utility-specific overrides (textColor / backgroundColor) win over `colors`, as in Tailwind.
        const key = name.replace(/-(\d+)$/u, '.$1')
        const hit = lookup(extend[type], key) ?? lookup(extend.colors, key) ?? lookup(palette, key) ?? (name === 'white' ? '#FFFFFF' : undefined)
        return normalise(hit, vars)
    }
    const surface = (name) => color('backgroundColor', name.replace(/^tsb-(\w+)$/u, 'tsb.$1.DEFAULT')) ?? color('colors', name.replace(/^tsb-(\w+)$/u, 'tsb.$1.DEFAULT'))
    const test = (name, fg, bg, min) => {
        if (!fg || !bg) { failures.push(`${app}: cannot resolve ${name}`); return }
        const r = ratio(fg, bg)
        rows.push({ app, name, fg, bg, r, min })
        if (r < min) failures.push(`${app}: ${name} (${fg} on ${bg}) is ${r.toFixed(2)}:1, needs ${min}:1`)
    }
    for (const t of TEXT) {
        for (const s of SURFACES) test(`text-${t} on ${s}`, color('textColor', t), surface(s), 4.5)
    }
    for (const f of FILLS) test(`white on bg-${f}`, '#FFFFFF', color('backgroundColor', f), 4.5)
    const ring = normalise('hsl(var(--ring))', vars)
    for (const s of SURFACES) test(`ring-ring on ${s}`, ring, surface(s), 3)
}

// Source scan: pale secondary text in engine and app templates.
const paleText = /(?<![\w-])(?:[a-z-]+:)*text-neutral-[345]00(?![\w-])/u
async function* walk(dir) {
    let entries
    try { entries = await readdir(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
        if (['node_modules', '.nuxt', '.output', '.data', 'e2e'].includes(e.name)) continue
        const p = join(dir, e.name)
        if (e.isDirectory()) yield* walk(p)
        else if (p.endsWith('.vue')) yield p
    }
}
let scanned = 0
for (const root of [join(repoRoot, 'layers/engine'), join(repoRoot, 'apps')]) {
    for await (const file of walk(root)) {
        scanned++
        const rel = file.slice(repoRoot.length + 1)
        ;(await readFile(file, 'utf8')).split('\n').forEach((text, i) => {
            if (/<svg|aria-hidden|contrast-ok|stroke=/u.test(text) || !paleText.test(text)) return
            failures.push(`${rel}:${i + 1}  ${paleText.exec(text)[0]} (secondary text must be neutral-600; neutral-300/400/500 fail on Tokyo Sushi's surfaces)`)
        })
    }
}

if (process.argv.includes('--table')) {
    for (const row of rows) console.log(`${row.app.padEnd(11)} ${row.name.padEnd(34)} ${row.fg} on ${row.bg}  ${row.r.toFixed(2)}:1  (>= ${row.min})`)
}
if (failures.length) {
    console.error(`token-contrast: ${failures.length} problem(s):\n`)
    for (const f of failures) console.error(`  ${f}`)
    process.exit(1)
}
console.log(`token-contrast: ${rows.length} pairs across ${apps.length} brands pass, ${scanned} templates free of pale text ✓`)
