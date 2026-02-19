FROM node:24.10-slim AS builder

# Set working directory
WORKDIR /usr/src/app

# Build arguments for environment variables
ARG BASE_URL
ARG API_BASE_URL
ARG S3_BUCKET_URL
ARG GRAPHQL_WS_URL

ENV BASE_URL=${BASE_URL}
ENV API_BASE_URL=${API_BASE_URL}
ENV S3_BUCKET_URL=${S3_BUCKET_URL}
ENV GRAPHQL_WS_URL=${GRAPHQL_WS_URL}

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (optionalDependencies in package.json handle native bindings)
RUN npm ci --prefer-offline --no-audit

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
