import globals from "globals";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";

/** @type {import('eslint').FlatConfig[]} */
export default [
    // 1) In one top-level config object, specify folders/files to ignore:
    {
        ignores: [
            ".nuxt",
            ".output",
            ".vscode",
            "node_modules",
            "plugins/api.ts"
        ],
    },
    {
        files: ["**/*.{js,mjs,cjs,ts,vue}"],
    },
    {
        languageOptions: {
            globals: globals.browser,
        },
    },
    ...tseslint.configs.recommended,
    ...pluginVue.configs["flat/essential"],
    {
        files: ["**/*.vue"],
        languageOptions: {
            parserOptions: {
                parser: tseslint.parser,
            },
        },
        rules: {
            "vue/multi-word-component-names": "off",
            "@typescript-eslint/ban-ts-comment": "off",
            "@typescript-eslint/no-explicit-any": "off",
        },
    },
];
