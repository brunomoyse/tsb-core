#!/usr/bin/env node
// Generate the responsive derivatives MktPicture expects for a product photo.
//
//   node scripts/product-photo.mjs <source-image> <slug>
//
// Emits public/images/dishes/<slug>-{320,560,800}.{avif,webp} plus a
// <slug>-560.png fallback, then prints the productPhotos.ts entry to add.
// Same pipeline as the existing bowl/mala-mix assets.
//
// Requires ImageMagick (`magick`), `cwebp` and `avifenc` on PATH
// (brew install imagemagick webp libavif).

import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'

const WIDTHS = [320, 560, 800]
const PNG_FALLBACK_WIDTH = 560
const OUT_DIR = resolve(import.meta.dirname, '../public/images/dishes')

const [source, slug] = process.argv.slice(2)
if (!source || !slug || !/^[a-z0-9-]+$/u.test(slug)) {
    console.error('Usage: node scripts/product-photo.mjs <source-image> <slug>')
    console.error('       slug must be the product slug (kebab-case), e.g. raviolis-chinois')
    process.exit(1)
}
if (!existsSync(source)) {
    console.error(`Source image not found: ${source}`)
    process.exit(1)
}

const run = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'ignore', 'inherit'] })

const tmp = mkdtempSync(join(tmpdir(), 'product-photo-'))
try {
    for (const w of WIDTHS) {
        const png = join(tmp, `${slug}-${w}.png`)
        // Never upscale (`>`), keep aspect ratio, fit inside a square.
        run('magick', [source, '-resize', `${w}x${w}>`, png])
        run('cwebp', ['-quiet', '-q', '85', '-alpha_q', '90', png, '-o', join(OUT_DIR, `${slug}-${w}.webp`)])
        run('avifenc', ['-q', '62', '--speed', '6', png, join(OUT_DIR, `${slug}-${w}.avif`)])
        if (w === PNG_FALLBACK_WIDTH) {
            run('magick', [png, '-strip', join(OUT_DIR, `${slug}-${w}.png`)])
        }
        console.log(`✓ ${slug}-${w}.{avif,webp}${w === PNG_FALLBACK_WIDTH ? ' + .png' : ''}`)
    }
} finally {
    rmSync(tmp, { recursive: true, force: true })
}

console.log(`\nDone → ${OUT_DIR}`)
console.log(`Now uncomment/add in data/productPhotos.ts:`)
console.log(`    '${slug}': { base: '/images/dishes/${slug}' },`)
console.log(`(source was ${basename(source)})`)
