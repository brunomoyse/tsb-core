# pili-shop

Customer-facing web shop of Pili: one Nuxt app per restaurant brand (`apps/tokyosushi`, `apps/ygfliege`) on a shared engine layer.

Repository `nuagemagique-dev/pili-shop`, local folder and internal name `tsb-core`. Images: `ghcr.io/nuagemagique-dev/pili-shop-tsb` (tokyosushi) and `ghcr.io/nuagemagique-dev/pili-shop-ygf` (ygfliege).

`tsb-core` lets customers browse the menu, build orders, pay online, and follow order status updates in real time.

## Stack

- Nuxt 4 (Vue 3, SSR)
- Tailwind CSS 4
- Pinia with persisted state
- GraphQL (queries/mutations/subscriptions)
- `@nuxtjs/i18n` (fr default, en, nl, zh)
- OIDC (Zitadel)

## Main features

- Menu browsing by category with search and dietary filters
- Cart with delivery/pickup, coupon support, and order extras
- Mollie checkout flow
- Real-time order tracking via GraphQL subscriptions
- Authenticated account pages (profile, orders, reorder)
- SEO metadata and schema.org integration

## Local setup

### 1) Environment

```bash
cp .env.example .env
```

Required for a production build (`npm run build`, the Docker image): there is no default, and the build fails
naming whatever is missing. They are baked into the client bundle, so set them when building (Docker: `--build-arg`).
The dev server and `nuxi typecheck` do not need them.

- `BASE_URL`
- `API_BASE_URL`
- `S3_BUCKET_URL`
- `GRAPHQL_WS_URL`
- `ZITADEL_AUTHORITY`
- `ZITADEL_CLIENT_ID`

Optional: `ZITADEL_NATIVE_CLIENT_ID`, `UMAMI_*`, `NUXT_PUBLIC_TURNSTILE_SITE_KEY`, `SENTRY_*`.

Runtime (read when the server starts, no rebuild): `NUXT_DEFER_HYDRATION=true` also holds the page's entry script back
until after the first paint (`layers/engine/utils/deferHydration.ts`). It paints earlier and hydrates later, so it is off by
default; the default only delays the language file and the prefetch hints.

### 2) Install and run

```bash
npm install
npm run dev
```

App runs on port `3000` by default.

## Commands

```bash
npm run dev
npm run build
npm run lint
npm test                 # unit tests (vp test run), see docs/testing.md
npm run test:coverage    # same, with v8 coverage and the CI thresholds
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:ui
```

E2E tests require:

- `E2E_USER_EMAIL`
- `E2E_USER_PASSWORD`

## Docker

```bash
docker build -t tsb-core --build-arg APP=tokyosushi .   # APP = the app under apps/ (tokyosushi or ygfliege)
docker run --name tsb-core --env-file .env -p 3000:3000 tsb-core
```

One Dockerfile serves every brand app (`ARG APP`). It is multi-stage with a healthcheck and supports multi-arch builds.

## Deployment

### tokyosushi (`ghcr.io/nuagemagique-dev/pili-shop-tsb`)

- Push to `main`: builds and publishes `:latest` (multi-arch) and deploys to the home server.
- Tag `v*`: builds `:production` + version tags (AMD64) and deploys to OVH.
- Manual rollback: run the workflow with the target version.

### ygfliege (`ghcr.io/nuagemagique-dev/pili-shop-ygf`)

- Push to `main`: builds and publishes `:latest` (multi-arch; the home server is
  arm64, so an amd64-only image would not start) and deploys to the home server
  at `ygf.brunomoyse.be`.
- Tag `ygf-v*`: builds `:production` + version tags (AMD64) from the `YGF_*`
  variables of the `production` environment, then deploys the Helm release
  `ygf-apps` (namespace `ygf`; see tsb-infra `YGF_PRODUCTION.md`).
- All ygfliege jobs are gated on the `YGF_BASE_URL` repo variable, so they no-op
  until the `YGF_*` variables exist.

## Pili repositories

Every Pili repository lives in the GitHub org `nuagemagique-dev`. Local folders kept their earlier names.

| Repository                      | Local folder     | What it is                                             |
| ------------------------------- | ---------------- | ------------------------------------------------------ |
| pili-api                        | `tsb-service`    | GraphQL API (Go) and the `pili-mcp` tool server        |
| **pili-shop** (this repository) | `tsb-core`       | Customer web shop, one Nuxt app per brand              |
| pili-dashboard                  | `tsb-dashboard`  | Admin dashboard (Nuxt)                                 |
| pili-mobile                     | `tsb-mobile`     | Customer iOS and Android app (Expo)                    |
| pili-handheld                   | `moyun-handheld` | Staff handheld app for the Sunmi V3H (Kotlin)          |
| pili-pos                        | `moyun-pos`      | SCE 2.0 cash register (Rust engine, Android and Linux) |
| pili-agent                      | `tsb-agent`      | Owner and staff Telegram agent                         |
| pili-infra                      | `tsb-infra`      | Helm charts, Terraform, SOPS secrets, runbooks         |
