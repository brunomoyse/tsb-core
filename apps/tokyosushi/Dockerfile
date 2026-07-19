# Build context = monorepo root (…/tsb-core), NOT this app dir, so the shared
# engine layer (layers/engine) is available to the build. In CI:
#   docker buildx build . --file apps/tokyosushi/Dockerfile ...
FROM node:24.18-slim AS builder

WORKDIR /usr/src/app

# Build arguments for environment variables (baked into the client bundle).
ARG BASE_URL
ARG API_BASE_URL
ARG S3_BUCKET_URL
ARG GRAPHQL_WS_URL
ARG ZITADEL_AUTHORITY
ARG ZITADEL_CLIENT_ID
ARG UMAMI_HOST
ARG UMAMI_WEBSITE_ID
ARG NUXT_PUBLIC_TURNSTILE_SITE_KEY

# Sentry (optional). SENTRY_DSN is public-by-design (embedded in client bundle).
# SENTRY_AUTH_TOKEN is private — only used at build time to upload source maps.
ARG SENTRY_DSN
ARG SENTRY_ENVIRONMENT
ARG SENTRY_RELEASE
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG SENTRY_AUTH_TOKEN

ENV BASE_URL=${BASE_URL} \
    API_BASE_URL=${API_BASE_URL} \
    S3_BUCKET_URL=${S3_BUCKET_URL} \
    GRAPHQL_WS_URL=${GRAPHQL_WS_URL} \
    ZITADEL_AUTHORITY=${ZITADEL_AUTHORITY} \
    ZITADEL_CLIENT_ID=${ZITADEL_CLIENT_ID} \
    UMAMI_HOST=${UMAMI_HOST} \
    UMAMI_WEBSITE_ID=${UMAMI_WEBSITE_ID} \
    NUXT_PUBLIC_TURNSTILE_SITE_KEY=${NUXT_PUBLIC_TURNSTILE_SITE_KEY} \
    SENTRY_DSN=${SENTRY_DSN} \
    SENTRY_ENVIRONMENT=${SENTRY_ENVIRONMENT} \
    SENTRY_RELEASE=${SENTRY_RELEASE} \
    SENTRY_ORG=${SENTRY_ORG} \
    SENTRY_PROJECT=${SENTRY_PROJECT} \
    SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}

# Copy workspace manifests first for dependency-install layer caching.
COPY package.json package-lock.json ./
COPY layers/engine/package.json ./layers/engine/package.json
COPY apps/tokyosushi/package.json ./apps/tokyosushi/package.json

# Install the whole workspace (hoisted to the root node_modules).
RUN npm ci --prefer-offline --no-audit

# Copy the shared engine layer + this brand app.
COPY layers ./layers
COPY apps/tokyosushi ./apps/tokyosushi

# Build only this app (pulls in the engine layer via `extends`).
RUN npm run build -w tokyosushi

# ---------- Runtime ----------
FROM node:24.18-alpine3.23

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV NITRO_PRESET=node-server

# Nitro's node-server output is self-contained (bundles its own
# .output/server/node_modules), so no runtime `npm install` is needed.
COPY --from=builder /usr/src/app/apps/tokyosushi/.output ./.output

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", ".output/server/index.mjs"]
