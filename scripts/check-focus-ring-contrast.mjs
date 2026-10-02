#!/usr/bin/env node
/*
 * Fails on pale focus-ring colours in .vue files.
 *
 * WCAG 1.4.11 needs a focus indicator of at least 3:1 against the surface. Tailwind's
 * `ring-neutral-300` / `ring-primary-300` / `ring-amber-400` steps are all below that on white, so
 * a keyboard user cannot see where focus is. Use `ring-ring` (the brand's `--ring` variable:
 * red-600 for Tokyo Sushi, orange-on-white for YGF) and add `ring-offset-2` on filled controls.
 *
 * Flagged: a `ring-<colour>-100…400` utility (optionally with an `/opacity`) carrying a
 * `focus:`, `focus-visible:`, `focus-within:` or `group-focus…:` variant, in any .vue file under
 * layers/engine or apps. Selected-state rings (no focus variant) are not checked. A line can opt
 * out with a trailing `<!-- ring-contrast-ok -->` or `/* ring-contrast-ok *\/` comment.
 */

import { readdir, readFile } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const roots = [join(repoRoot, 'layers/engine'), join(repoRoot, 'apps')]
const skipDirs = new Set(['node_modules', '.nuxt', '.output', '.data'])

// e.g. focus-visible:ring-neutral-300, focus:ring-primary-300/50, focus-visible:ring-amber-300
const paleFocusRing = /(?:group-)?focus(?:-visible|-within)?:ring-[a-z]+(?:-[a-z]+)*-[1-4]00(?:\/\d+)?(?![\w-])/u

async function* walk(dir) {
    let entries
    try { entries = await readdir(dir, { withFileTypes: true }) } catch { return }
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
        if (extname(file) !== '.vue') continue
        const rel = relative(repoRoot, file)
        const lines = (await readFile(file, 'utf8')).split('\n')
        lines.forEach((text, i) => {
            if (text.includes('ring-contrast-ok')) return
            const m = paleFocusRing.exec(text)
            if (m) problems.push(`${rel}:${i + 1}  ${m[0]}`)
        })
    }
}

if (problems.length) {
    console.error(`focus-ring-contrast: ${problems.length} focus ring(s) below 3:1:\n`)
    for (const p of problems) console.error(`  ${p}`)
    console.error('\nFix: use focus-visible:ring-ring (+ focus-visible:ring-offset-2 on filled controls).')
    process.exit(1)
}
console.log('focus-ring-contrast: no pale focus rings ✓')
