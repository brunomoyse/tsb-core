FROM node:24.10-slim AS builder

# Set working directory
WORKDIR /usr/src/app

# Set environment variables
# @TODO: Use .env file
ENV BASE_URL="https://tokyo.brunomoyse.be"
ENV API_BASE_URL="https://tokyo.brunomoyse.be/api/v1"
ENV S3_BUCKET_URL="https://d1sq9yypil8nox.cloudfront.net"
ENV GRAPHQL_WS_URL="wss://tokyo.brunomoyse.be/v1/graphql"

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies without running postinstall scripts
RUN npm ci --ignore-scripts

# Install platform-specific bindings for the current architecture only
# This avoids EBADPLATFORM errors when building multi-platform images
RUN if [ "$(uname -m)" = "x86_64" ]; then \
      npm install --no-save --force @oxc-minify/binding-linux-x64-gnu @esbuild/linux-x64 || true; \
    elif [ "$(uname -m)" = "aarch64" ]; then \
      npm install --no-save --force @oxc-minify/binding-linux-arm64-gnu @esbuild/linux-arm64 || true; \
    fi

# Now run nuxt prepare manually
RUN npm run postinstall

# Copy the rest of the application code
COPY . .

# Build the Nuxt application
RUN npm run build

# Stage 2: Production
FROM node:24.10-alpine3.22

# Set working directory
WORKDIR /usr/src/app

# Set environment variables
ENV NODE_ENV=production
ENV NITRO_PRESET=node-server

# Copy only the built output and necessary files
COPY --from=builder /usr/src/app/.output ./.output
COPY --from=builder /usr/src/app/package*.json ./

# Install only production dependencies (skip postinstall since .output is already built)
RUN npm install --production --ignore-scripts

# Clean npm cache to reduce image size
RUN npm cache clean --force

# Expose the port that the application will run on
EXPOSE 3000

# Command to run the Nuxt server
CMD ["node", ".output/server/index.mjs"]
