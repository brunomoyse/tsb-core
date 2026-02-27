# tsb-core

**tsb-core** is the customer-facing web application for a restaurant webshop. Customers can browse the menu, place orders, make payments, and track their order status in real time.

## Features

- **Product Menu**: Browse products by category with search, dietary filters (halal, vegan, spicy), and product choices
- **Shopping Cart**: Add products, adjust quantities, choose delivery or pickup, apply coupons
- **Online Payments**: Secure checkout via Mollie payment integration
- **Order Tracking**: Real-time order status updates via GraphQL subscriptions
- **User Accounts**: Registration, login, profile management, and Google OAuth
- **Multi-language**: French (default), English, and Chinese
- **SEO Optimized**: Server-side rendering, sitemap generation, and Schema.org structured data

## Technologies

- **Nuxt 4** (Vue 3, SSR enabled)
- **Tailwind CSS 4** with custom sakura theme
- **Pinia** with persisted state for state management
- **GraphQL** with graphql-ws for real-time subscriptions
- **@nuxtjs/i18n v10** for multi-language support (fr, en, zh)
- **Google Fonts** and **Schema.org** via Nuxt modules

## Getting Started

### 1. Setup Environment Variables

```bash
cp .env.example .env
```

Configure:
- `BASE_URL` — Application base URL
- `API_BASE_URL` — Backend API base URL
- `S3_BUCKET_URL` — CloudFront/S3 bucket URL for product images

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

### 4. Build for Production

```bash
npm run build
```

## Linting

```bash
npm run lint
```

Uses oxlint with typescript and vue plugins.

## E2E Testing

```bash
npm run test:e2e           # Headless
npm run test:e2e:headed    # With visible browser
```

Uses Playwright with Desktop Chrome. Requires `E2E_USER_EMAIL` and `E2E_USER_PASSWORD` env vars.

## Docker

```bash
docker build -t tsb-core .
docker run --name tsb-core --env-file .env -p 3000:3000 tsb-core
```

Multi-stage Dockerfile with health check. Supports multi-arch builds (AMD64/ARM64).

## Deployment

### Release
```bash
git tag v1.0.0
git push origin v1.0.0
```
Triggers a GitHub Actions workflow that builds a `:production` + `:v1.0.0` AMD64 image with production URLs baked in, and deploys to the production server via SSH.

### Rollback
Go to the Actions tab → "Run workflow" → enter the version to rollback to (e.g. `v1.0.0`).

### Test
Push to `main` automatically builds a `:latest` multi-arch image and deploys to the home server.
