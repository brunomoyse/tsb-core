FROM node:20-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Set environment variables
ENV API_BASE_URL_CLIENT=http://localhost:8080
ENV API_BASE_URL_SERVER=http://host.docker.internal:8080

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (including dev dependencies for building)
RUN npm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the Nuxt application
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Set environment variables
ENV NODE_ENV=production
ENV NITRO_PRESET=node-server
ENV API_BASE_URL_CLIENT=http://localhost:8080
ENV API_BASE_URL_SERVER=http://host.docker.internal:8080

# Copy only the built output and necessary files
COPY --from=builder /usr/src/app/.output ./.output
COPY --from=builder /usr/src/app/package*.json ./

# Install only production dependencies
RUN npm install --production --frozen-lockfile

# Clean npm cache to reduce image size
RUN npm cache clean --force

# Expose the port that the application will run on
EXPOSE 3000

# Command to run the Nuxt server
CMD ["node", ".output/server/index.mjs"]
