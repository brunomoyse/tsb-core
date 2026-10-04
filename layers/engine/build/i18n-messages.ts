import { type Messages, buildLocaleMessages } from '../utils/localeMessages'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { createJiti } from 'jiti'
import { defineNuxtModule } from '@nuxt/kit'
import { fileURLToPath } from 'node:url'

/*
 * Writes the finished messages of the brand being built, one JSON file per language, and hands them to @nuxtjs/i18n
 * (audit PR 6.2, P11). They used to be four static imports of the engine's and the brand's files in i18n.config.ts,
 * merged and given the brand's name and phone in the browser, so every visitor downloaded and parsed all four
 * languages. As files registered with the language module they are loaded lazily: only the visitor's language (and
 * the French fallback) is fetched, already merged, so nothing is merged or replaced at run time.
 *
 * Must be listed BEFORE '@nuxtjs/i18n' in the engine's modules: that module asks for registered locales while it sets
 * itself up. The files go to node_modules/.cache of the brand app (.nuxt is emptied after the modules have run).
 */

const engineLocales = join(dirname(fileURLToPath(import.meta.url)), '..', 'locales')

const readJson = (path: string): Messages => JSON.parse(readFileSync(path, 'utf8')) as Messages

export default defineNuxtModule({
  meta: { name: 'tsb-i18n-messages' },
  setup(_options, nuxt) {
    const appRoot = nuxt.options.rootDir
    const outDir = resolve(appRoot, 'node_modules/.cache/tsb-i18n-messages')
    const locales = (nuxt.options.i18n?.locales ?? []) as { code: string; language?: string }[]

    const generate = (): void => {
      // The brand's own identity (`#brand` is the app root): only the phone number is needed here.
      const jiti = createJiti(import.meta.url, { moduleCache: false })
      const { brand } = jiti(join(appRoot, 'brand.ts')) as { brand: { phone: string } }
      mkdirSync(outDir, { recursive: true })
      for (const { code } of locales) {
        const messages = buildLocaleMessages(
          readJson(join(engineLocales, `${code}.json`)),
          readJson(join(appRoot, 'locales', `${code}.json`)),
          brand.phone,
        )
        const file = join(outDir, `${code}.json`)
        const next = `${JSON.stringify(messages)}\n`
        let current = ''
        try {
          current = readFileSync(file, 'utf8')
        } catch {
          // First build: nothing to compare with.
        }
        // Only a real change rewrites the file, so the watchers of the dev server are left alone.
        if (current !== next) writeFileSync(file, next)
      }
    }
    generate()

    nuxt.hook('i18n:registerModule', (register) => {
      register({
        langDir: outDir,
        // The module types its locale codes from the project's own config: ours are the same four, as plain strings.
        locales: locales.map(({ code, language }) => ({
          code,
          language: language ?? code,
          file: `${code}.json`,
        })) as Parameters<typeof register>[0]['locales'],
      })
    })

    /*
     * The address of each language file, for the page to preload (middleware/preload-messages.global.ts). The module
     * names them `/_i18n/<hash of the files' content>/<locale>/messages.json` and only keeps the hash in its own bundle;
     * it adds those addresses to the routes Nitro prerenders, which is where they are read from. Private runtime config:
     * only the server render needs it.
     */
    nuxt.hook('nitro:init', (nitro) => {
      const urls: Record<string, string> = {}
      for (const route of nitro.options.prerender.routes ?? []) {
        const match = /^\/_i18n\/[^/]+\/(?<code>[^/]+)\/messages\.json$/u.exec(route)
        if (match?.groups?.code) urls[match.groups.code] = route
      }
      ;(nitro.options.runtimeConfig as Record<string, unknown>).tsbI18nMessageUrls = urls
    })

    // Dev: a locale file of the engine or of the brand changed.
    nuxt.hook('builder:watch', (_event, path) => {
      if (/(^|\/)locales\/[a-z]{2}\.json$/u.test(path) || path.endsWith('brand.ts')) generate()
    })
  },
})
