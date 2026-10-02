# Theme contract

Everything in `layers/engine` is written once and must render correctly in every brand. It therefore
talks to the theme through **names**, never through a brand's literal colours. Each brand maps the names
in its `tailwind.config.ts` (and `assets/css/*.css` for the HSL variables).

| Name | Meaning |
|---|---|
| `primary-50 … 900` | brand accent scale (red for Tokyo Sushi, orange for YGF); `primary` / `primary-hover` / `primary-soft` are the CTA fill, its hover and a tint |
| `neutral-50 … 900` | text, surface and border neutrals (gray for Tokyo Sushi, the YGF greys) |
| `tsb-one … four` | page, container, decorative, selected |
| `ring` | keyboard focus ring colour (`--ring`) |
| `red`, `amber`, `green`, `emerald`, `blue` | the same meaning in every brand: error, warning, success, completed, halal |

`primary-*`/`neutral-*`/`tsb-*` class names stay stable; a brand may override a step where the raw scale
fails contrast (YGF: `backgroundColor.primary`, `textColor.primary`, `borderColor.neutral`).

## Accessibility rules the contract carries

- Text is 4.5:1 on every surface it sits on. Secondary text is `text-neutral-600`; `neutral-300/400/500`
  and `primary-300/400/500` are decorative steps (hairlines, separators, glyphs) and never carry text.
  Accent text is `text-primary-700` (hover `-800`); status text is `red-700`, `amber-800`, `green-800`,
  `emerald-700`.
- A CTA fill carrying white is `bg-primary-600` (hover `-700`) or bare `bg-primary`.
- Focus is `focus-visible:ring-2 focus-visible:ring-ring` (add `ring-offset-2` on filled controls), at
  least 3:1 (WCAG 1.4.11). Never `ring-<colour>-100…400`.
- Do not tell an error from the brand red by colour alone (Tokyo Sushi: red-600 vs red-700): pair it with
  an icon and the tinted box.

## Guards (all run in `npm run lint`)

- `scripts/check-engine-boundaries.mjs`: the engine only uses the names above (no raw gray/orange/slate…,
  no hex colours, no brand-name literals).
- `scripts/check-token-contrast.mjs`: reads both brands' real configs and fails if a contract text colour,
  CTA fill or the focus ring drops below its ratio (`--table` prints every pair), and if a template
  uses pale secondary text.
- `scripts/check-focus-ring-contrast.mjs`: no `focus:ring-<colour>-100…400` utility in a template.

## Moving a file into the engine

Both apps used to hold near-identical copies of many components and pages; one copy now lives in
`layers/engine` and an app keeps a file only to override it (Nuxt resolves an app file over a layer
file of the same path). When you move one: write it with the contract names above, import siblings
through `#engine/components/...` (never `~/components/...`: `~` is the app) and brand data through
`#brand/...`, and take brand facts from `useAppConfig().brand` (`legalName`, `legalForm`,
`dishesLabel`, `deliveryEnabled`, `japaneseAccents`, ...) instead of keeping a per-brand copy.
