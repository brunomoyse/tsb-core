import { defineConfig } from 'vite-plus'

export default defineConfig({
  // Unit tests only; the Playwright suites under */e2e are run by `playwright test`.
  test: {
    include: ['layers/**/*.test.mjs'],
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
