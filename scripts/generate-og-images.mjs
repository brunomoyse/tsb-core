#!/usr/bin/env node
/*
 * Generates the default share image (og:image) of each brand: apps/<app>/public/images/og-default.jpg,
 * 1200x630 (the 1.91:1 every network crops to), under 150 KB (WhatsApp drops previews above ~300 KB).
 *
 * It is composed from the brand's own assets in Chromium (already a dev dependency through Playwright) and saved as a
 * JPEG, lowering the quality until the file fits. Re-run after changing a brand asset:
 *
 *   node scripts/generate-og-images.mjs            # both brands
 *   node scripts/generate-og-images.mjs ygfliege   # one
 *
 * Needs a Chromium: Playwright's own (`npx playwright install chromium`), or set CHROMIUM_PATH.
 * The files are cached for a year by the apps (nitro publicAssets): when you change the image, rename it
 * (og-default-2.jpg) and update layers/engine/plugins/seo-defaults.ts.
 */

import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'
import { chromium } from '@playwright/test'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MAX_BYTES = 150_000
const WIDTH = 1200
const HEIGHT = 630

const asset = (app, path) => pathToFileURL(join(root, 'apps', app, 'public', path)).href

// Tokyo Sushi Bar: warm beige panel with the logo and a red rule, the illustrated dining room on the right.
const tokyosushi = () => `
<style>
  @font-face { font-family: Channel; src: url('${asset('tokyosushi', 'fonts/channel.woff2')}') format('woff2'); }
  * { box-sizing: border-box; margin: 0; }
  body { width: ${WIDTH}px; height: ${HEIGHT}px; display: flex; background: #F0EBE3; font-family: 'Noto Sans', 'Helvetica Neue', Arial, sans-serif; overflow: hidden; }
  .panel { width: 430px; height: 100%; padding: 48px 40px 44px 52px; display: flex; flex-direction: column; justify-content: center; }
  .panel img { flex: none; width: 270px; height: auto; margin-left: -12px; }
  .rule { flex: none; width: 72px; height: 6px; background: #DC2626; border-radius: 3px; margin: 14px 0 26px; }
  .tag { font-family: Channel, 'Noto Sans', sans-serif; font-size: 36px; line-height: 1.15; color: #1c1917; }
  .sub { margin-top: 14px; font-size: 21px; font-weight: 500; color: #4B5563; letter-spacing: .02em; }
  .band { width: 10px; background: #DC2626; }
  .photo { flex: 1; background: url('${asset('tokyosushi', 'images/restaurant-illustrated.png')}') 100% 70% / auto 112% no-repeat; }
</style>
<div class="panel">
  <img src="${asset('tokyosushi', 'images/tsb-black-font-400.png')}" alt="">
  <div class="rule"></div>
  <div class="tag">Sushi, sashimi<br>&amp; cuisine japonaise</div>
  <div class="sub">Commandez en ligne · Liège</div>
</div>
<div class="band"></div>
<div class="photo"></div>`

// Yangguofu Malatang Liège (GUIDELINES.md): cream and orange, the floating bowl, no sakura and no calligraphy ornaments.
const ygfliege = () => `
<style>
  * { box-sizing: border-box; margin: 0; }
  body { width: ${WIDTH}px; height: ${HEIGHT}px; position: relative; background: #FDF5EC; font-family: 'Noto Sans', 'Helvetica Neue', Arial, sans-serif; overflow: hidden; }
  .glow { position: absolute; right: -90px; top: -70px; width: 770px; height: 770px; border-radius: 50%; background: radial-gradient(circle at 42% 40%, #FDBA74 0%, #F58220 72%); }
  .bowl { position: absolute; right: 36px; top: -4px; height: 650px; width: auto; filter: drop-shadow(0 18px 24px rgba(154, 52, 18, .35)); }
  .text { position: absolute; left: 64px; top: 0; bottom: 0; width: 600px; display: flex; flex-direction: column; justify-content: center; }
  .brand { display: flex; align-items: center; gap: 20px; }
  .brand img { width: 84px; height: 84px; }
  .name { font-size: 30px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #1c1917; line-height: 1.15; }
  .name span { display: block; font-size: 22px; font-weight: 600; letter-spacing: .14em; color: #9A3412; }
  .slogan { margin-top: 44px; font-size: 62px; line-height: 1.08; font-weight: 900; color: #1c1917; letter-spacing: -.01em; }
  .sub { margin-top: 24px; font-size: 25px; font-weight: 500; color: #4B5563; }
</style>
<div class="glow"></div>
<img class="bowl" src="${asset('ygfliege', 'images/hero/bowl-creative-1000.png')}" alt="">
<div class="text">
  <div class="brand">
    <img src="${asset('ygfliege', 'images/logos/logo-color.svg')}" alt="">
    <div class="name">Yangguofu<span>Malatang · Liège</span></div>
  </div>
  <div class="slogan">Le bonheur<br>tient dans<br>un bol</div>
  <div class="sub">Bouillon aux herbes, cuit minute</div>
</div>`

const templates = { tokyosushi, ygfliege }

const wanted = process.argv.slice(2)
const apps = wanted.length ? wanted : Object.keys(templates)

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
const work = await mkdtemp(join(tmpdir(), 'og-'))
try {
    for (const app of apps) {
        if (!templates[app]) throw new Error(`Unknown app "${app}" (expected ${Object.keys(templates).join(', ')})`)
        const file = join(work, `${app}.html`)
        await writeFile(file, `<!doctype html><meta charset="utf-8">${templates[app]()}`)
        const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 })
        await page.goto(pathToFileURL(file).href)
        await page.evaluate(() => document.fonts.ready)
        await page.waitForFunction(() => [...document.images].every((i) => i.complete))
        let buffer
        for (let quality = 86; quality >= 40; quality -= 4) {
            buffer = await page.screenshot({ type: 'jpeg', quality })
            if (buffer.length <= MAX_BYTES) {
                console.log(`${app}: quality ${quality}`)
                break
            }
        }
        if (buffer.length > MAX_BYTES) throw new Error(`${app}: ${buffer.length} bytes is over the ${MAX_BYTES} budget`)
        const out = join(root, 'apps', app, 'public', 'images', 'og-default.jpg')
        await writeFile(out, buffer)
        console.log(`${app}: ${out} (${(await stat(out)).size} bytes, ${WIDTH}x${HEIGHT})`)
        await page.close()
    }
} finally {
    await browser.close()
    await rm(work, { recursive: true, force: true })
}
