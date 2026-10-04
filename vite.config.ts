import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite-plus'
import { runtimeFlagsPlugin } from './test/flags'

const r = (path: string) => fileURLToPath(new URL(path, import.meta.url))
// The aliases brand apps declare in their nuxt.config.ts, for the vitest projects that do not boot Nuxt.
const alias = (app: 'tokyosushi' | 'ygfliege') => ({
  '#engine': r('./layers/engine'),
  '#brand': r(`./apps/${app}`),
})
const excluded = ['**/node_modules/**', '**/.nuxt/**', '**/.output/**']

// Nitro server handlers (routes, API, middleware): h3 + a stand-in for Nitro's `#imports` (test/nitro). One project per
// brand, because `#brand` is a build-time alias: the handlers of an app render that app's brand.
const serverProject = (
  app: 'tokyosushi' | 'ygfliege',
  include: string[],
  exclude: string[] = [],
) => ({
  plugins: [runtimeFlagsPlugin({ server: true, client: false, dev: false })],
  resolve: { alias: { ...alias(app), '#imports': r('./test/nitro/imports.ts') } },
  test: {
    name: app === 'tokyosushi' ? 'server' : `server-${app}`,
    include,
    exclude: [...excluded, ...exclude],
    unstubGlobals: true,
    unstubEnvs: true,
    restoreMocks: true,
    setupFiles: [
      r('./test/setup/noNetwork.ts'),
      r('./test/setup/flags.ts'),
      r('./test/nitro/setup.ts'),
    ],
  },
})

export default defineConfig({
  // Unit tests (see docs/testing.md); the Playwright suites under */e2e are run by `playwright test`.
  test: {
    projects: [
      {
        // Pure code: no Nuxt, no Nitro. Node environment, fast.
        plugins: [runtimeFlagsPlugin({ server: false, client: true, dev: false })],
        resolve: { alias: alias('tokyosushi') },
        test: {
          name: 'unit',
          include: ['{layers,apps}/**/*.test.{mjs,ts}'],
          setupFiles: [r('./test/setup/noNetwork.ts'), r('./test/setup/flags.ts')],
          exclude: [...excluded, '**/*.nuxt.test.ts', '**/*.server.test.ts'],
          unstubGlobals: true,
          unstubEnvs: true,
          restoreMocks: true,
        },
      },
      serverProject('tokyosushi', ['{layers,apps}/**/*.server.test.ts'], ['apps/ygfliege/**']),
      // The brand-agnostic engine handlers run under both brands.
      serverProject('ygfliege', [
        'apps/ygfliege/**/*.server.test.ts',
        'layers/engine/server/routes/robots.txt.server.test.ts',
      ]),
      './vitest.nuxt.config.ts',
      './vitest.nuxt-ygfliege.config.ts',
    ],
    coverage: {
      provider: 'v8',
      // TypeScript sources of both brand apps and the engine layer. `.vue` files are covered by the Playwright suites.
      include: ['{layers,apps}/**/*.ts'],
      exclude: [
        '**/node_modules/**',
        '**/.nuxt/**',
        '**/.output/**',
        '**/*.test.*',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/brand.ts',
        '**/types/**',
        '**/e2e/**',
        'layers/engine/build/**',
      ],
      reporter: ['text-summary', 'json-summary', 'lcov'],
      reportsDirectory: 'coverage',
      // A ratchet just under the measured values (99.7 % statements, 98.8 % branches, 100 % lines). Only ever raise it.
      thresholds: { statements: 99, branches: 98, functions: 99, lines: 99 },
    },
  },
  staged: {
    '*': 'vp check --fix',
  },
  fmt: {
    singleQuote: true,
    semi: false,
    ignorePatterns: ['.claude/**', '**/public/**', 'docs/baselines/**', '**/e2e/**/*-snapshots/**'],
  },
  lint: {
    plugins: ['typescript', 'vue'],
    categories: {
      correctness: 'error',
      suspicious: 'warn',
      pedantic: 'warn',
      perf: 'warn',
      style: 'warn',
    },
    rules: {
      'no-shadow': 'warn',
      'no-underscore-dangle': [
        'warn',
        {
          allow: ['__dirname', '__vue_app__', '_client'],
        },
      ],
      'default-case-last': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: 'error',
      curly: 'off',
      'id-length': 'off',
      'max-lines-per-function': 'off',
      'max-lines': 'off',
      'max-statements': 'off',
      'func-style': 'off',
      'no-magic-numbers': 'off',
      'no-ternary': 'off',
      'no-nested-ternary': 'off',
      'sort-keys': 'off',
      'no-inline-comments': 'off',
      'init-declarations': 'off',
      'no-continue': 'off',
      'no-await-in-loop': 'off',
      'unicorn/no-nested-ternary': 'off',
      'one-var': 'off',
      'vite-plus/prefer-vite-plus-imports': 'error',
      // The autofix capitalises the first letter of every comment line, which mangles continuation lines
      // ("Node scripts/product-photo.mjs") and code examples in comments.
      'capitalized-comments': 'off',
      // Two more autofixes the pre-commit hook (`vp check --fix`) applies blindly: the first strips casts that the
      // lint run (without Nuxt's generated types) believes useless, the second rewrites arrow bodies as `=>{  x; }`.
      'typescript/no-unnecessary-type-assertion': 'off',
      'typescript/strict-void-return': 'off',
    },
    env: {
      browser: true,
    },
    ignorePatterns: ['.nuxt', '.output', 'node_modules', 'scripts'],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    jsPlugins: [
      {
        name: 'vite-plus',
        specifier: 'vite-plus/oxlint-plugin',
      },
    ],
  },
})
