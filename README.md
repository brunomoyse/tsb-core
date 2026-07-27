# tsb-core

Customer-facing webshop for Tokyo Sushi Bar.

`tsb-core` lets customers browse the menu, build orders, pay online, and follow order status updates in real time.

## Stack

- Nuxt 4 (Vue 3, SSR)
- Tailwind CSS 4
- Pinia with persisted state
- GraphQL (queries/mutations/subscriptions)
- `@nuxtjs/i18n` (fr default, en, zh)
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

Minimum variables:

- `BASE_URL`
- `API_BASE_URL`
- `S3_BUCKET_URL`
- `ZITADEL_AUTHORITY`
- `ZITADEL_CLIENT_ID`
- `ZITADEL_NATIVE_CLIENT_ID`

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
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:ui
```

E2E tests require:

- `E2E_USER_EMAIL`
- `E2E_USER_PASSWORD`

## Docker

```bash
docker build -t tsb-core .
docker run --name tsb-core --env-file .env -p 3000:3000 tsb-core
```

The Dockerfile is multi-stage with a healthcheck and supports multi-arch builds.

## Deployment

### tokyosushi (`ghcr.io/brunomoyse/tsb-core`)

- Push to `main`: builds and publishes `:latest` (multi-arch) and deploys to the home server.
- Tag `v*`: builds `:production` + version tags (AMD64) and deploys to OVH.
- Manual rollback: run the workflow with the target version.

### ygfliege (`ghcr.io/brunomoyse/tsb-core-ygfliege`)

- Push to `main`: builds and publishes `:latest` (multi-arch — the home server is
  arm64, so an amd64-only image would not start) and deploys to the home server
  at `ygf.brunomoyse.be`.
- Tag `ygf-v*`: builds `:production` + version tags (AMD64). No production deploy
  job yet — YGF prod infra is provisioned separately.
- All ygfliege jobs are gated on the `YGF_BASE_URL` repo variable, so they no-op
  until the `YGF_*` variables exist.
