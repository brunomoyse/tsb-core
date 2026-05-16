#!/usr/bin/env node
/*
 * Flags top-level pub/sub subscriptions in setup code that would leak per request on SSR.
 *
 * Background: in March 2026, layouts/default.vue called `eventBus.on('notify', ...)` at the top of
 * <script setup>. Because the module-scope mitt singleton was shared across all SSR requests and
 * onUnmounted never fires server-side, each request appended a permanent listener; the closure
 * pinned the request's reactive context. RSS climbed ~900 MiB/hour at peak traffic and the pod
 * crashed every 4h. This script makes that class of leak fail CI.
 *
 * Allowed shapes (not flagged):
 *  - Inside onMounted(...), onActivated(...), watch(...), or any function/method body.
 *  - Inside `if (import.meta.client) { ... }` (or `if (process.client)`).
 *  - Lines preceded by `// ssr-safe: <reason>` (an explicit opt-out for known-safe patterns).
 *
 * Flagged shapes (top-level setup body):
 *  - `eventBus.on(...)`, `bus.on(...)`, `useEventBus(...).on(...)`, any `*.on(...)` call.
 *  - `*.addEventListener(...)`
 *  - `*.subscribe(...)`
 *
 * Scope: components/, composables/, layouts/, pages/, middleware/ — code that runs in the SSR
 * render path. The server/ directory is excluded; Nitro handlers run per request and don't share
 * state in this way.
 */

import { readdir, readFile } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseSync } from 'oxc-parser'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const scanDirs = ['components', 'composables', 'layouts', 'pages', 'middleware']
const exts = new Set(['.vue', '.ts'])

const flaggedMethods = new Set(['on', 'addEventListener', 'subscribe'])
const lifecycleWrappers = new Set([
    'onMounted', 'onActivated', 'onBeforeMount', 'onBeforeUnmount', 'onUnmounted',
    'onDeactivated', 'onErrorCaptured', 'onRenderTracked', 'onRenderTriggered',
    'onUpdated', 'onBeforeUpdate', 'onServerPrefetch', 'onScopeDispose',
    'watch', 'watchEffect', 'watchPostEffect', 'watchSyncEffect',
])

async function* walk(dir) {
    let entries
    try { entries = await readdir(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
        const p = join(dir, e.name)
        if (e.isDirectory()) yield* walk(p)
        else if (exts.has(extname(p))) yield p
    }
}

function extractScriptBlock(source, filePath) {
    if (filePath.endsWith('.ts')) return { code: source, offset: 0 }
    // .vue — pick the <script setup> block (or first <script>) by hand. We don't need full SFC
    // parsing, just the script body offset so line numbers reported below match the file.
    const setupMatch = source.match(/<script[^>]*\bsetup\b[^>]*>([\s\S]*?)<\/script>/u)
    if (setupMatch) {
        const offset = setupMatch.index + setupMatch[0].indexOf('>') + 1
        return { code: setupMatch[1], offset }
    }
    const plainMatch = source.match(/<script[^>]*>([\s\S]*?)<\/script>/u)
    if (plainMatch) {
        const offset = plainMatch.index + plainMatch[0].indexOf('>') + 1
        return { code: plainMatch[1], offset }
    }
    return null
}

function offsetToLineCol(source, offset) {
    let line = 1, col = 1
    for (let i = 0; i < offset && i < source.length; i++) {
        if (source.charCodeAt(i) === 10) { line++; col = 1 } else col++
    }
    return { line, col }
}

function hasSsrSafeComment(source, beforeOffset) {
    // Walk backwards over whitespace; check the comment on the line immediately above.
    let i = beforeOffset - 1
    while (i >= 0 && (source[i] === ' ' || source[i] === '\t')) i--
    if (i < 0 || source[i] !== '\n') return false
    let lineEnd = i
    let lineStart = lineEnd - 1
    while (lineStart >= 0 && source[lineStart] !== '\n') lineStart--
    const line = source.slice(lineStart + 1, lineEnd).trim()
    return /^\/\/\s*ssr-safe(?::|$)/iu.test(line)
}

function isClientGuardedIf(node) {
    if (node.type !== 'IfStatement') return false
    const test = node.test
    // import.meta.client  OR  process.client
    if (test.type === 'MemberExpression' && test.property?.name === 'client') {
        const obj = test.object
        if (obj?.type === 'MetaProperty' && obj.meta?.name === 'import' && obj.property?.name === 'meta') return true
        if (obj?.type === 'Identifier' && obj.name === 'process') return true
    }
    return false
}

function violationsForExpression(callExpr, scriptCode, scriptOffset, fileSource) {
    const callee = callExpr.callee
    if (callee?.type !== 'MemberExpression') return null
    const prop = callee.property
    if (!prop || prop.type !== 'Identifier' || !flaggedMethods.has(prop.name)) return null
    const startInScript = callExpr.start
    const startInFile = scriptOffset + startInScript
    if (hasSsrSafeComment(fileSource, startInFile)) return null
    return { offsetInFile: startInFile, method: prop.name }
}

function walkProgramBody(programBody, scriptCode, scriptOffset, fileSource, violations) {
    for (const stmt of programBody) {
        // ExpressionStatement at top level: the dangerous shape.
        if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'CallExpression') {
            const v = violationsForExpression(stmt.expression, scriptCode, scriptOffset, fileSource)
            if (v) violations.push(v)
        }
        // VariableDeclaration whose init is a flagged call (rare, but possible).
        if (stmt.type === 'VariableDeclaration') {
            for (const d of stmt.declarations) {
                if (d.init?.type === 'CallExpression') {
                    const v = violationsForExpression(d.init, scriptCode, scriptOffset, fileSource)
                    if (v) violations.push(v)
                }
            }
        }
        // IfStatement guarded by import.meta.client / process.client: descend into both branches
        // but treat the body as not-top-level (it's already gated).
        if (stmt.type === 'IfStatement' && isClientGuardedIf(stmt)) continue
        // Other IfStatements: only their conditions are top-level; bodies are inside a block.
    }
}

async function checkFile(filePath, repoRoot) {
    const source = await readFile(filePath, 'utf8')
    const extracted = extractScriptBlock(source, filePath)
    if (!extracted) return []
    const { code, offset } = extracted
    let ast
    try {
        ast = parseSync(filePath, code, { lang: filePath.endsWith('.ts') ? 'ts' : 'ts', sourceType: 'module' })
    } catch (e) {
        // Parse error — skip silently; oxlint will catch real syntax issues.
        return []
    }
    const violations = []
    walkProgramBody(ast.program.body, code, offset, source, violations)
    return violations.map(v => {
        const { line, col } = offsetToLineCol(source, v.offsetInFile)
        return {
            file: relative(repoRoot, filePath),
            line,
            col,
            method: v.method,
        }
    })
}

async function main() {
    const allViolations = []
    for (const dir of scanDirs) {
        const abs = join(root, dir)
        for await (const file of walk(abs)) {
            const v = await checkFile(file, root)
            allViolations.push(...v)
        }
    }
    if (allViolations.length === 0) {
        console.log('ssr-safety: 0 top-level subscriptions found ✓')
        return
    }
    console.error(`ssr-safety: ${allViolations.length} top-level subscription(s) — each leaks per SSR request:\n`)
    for (const v of allViolations) {
        console.error(`  ${v.file}:${v.line}:${v.col}  .${v.method}() at top of setup`)
    }
    console.error(
        `\nFix: wrap in onMounted() / if (import.meta.client) {} / add a "// ssr-safe: <reason>" comment.\n` +
        `For pub/sub specifically, prefer VueUse useEventBus (auto-cleans on scope dispose).`
    )
    process.exit(1)
}

main().catch(err => {
    console.error('ssr-safety: unexpected error', err)
    process.exit(2)
})
