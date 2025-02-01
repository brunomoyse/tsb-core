FROM node:22-alpine3.21 AS builder

# Set working directory
WORKDIR /usr/src/app

# Set environment variables
#ENV API_BASE_URL_CLIENT="http://35.181.95.58/api"
#ENV API_BASE_URL_SERVER="http://35.181.95.58/api"
ENV API_BASE_URL_CLIENT="https://brunomoyse.be/api"
ENV API_BASE_URL_SERVER="https://brunomoyse.be/api"
ENV S3_BUCKET_URL="https://d1sq9yypil8nox.cloudfront.net"
ENV BASE_URL="/"

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (including dev dependencies for building)
RUN npm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the Nuxt application
RUN npm run build

# Stage 2: Production
FROM node:22-alpine3.21

# Set working directory
WORKDIR /usr/src/app

# Set environment variables
ENV NODE_ENV=production
ENV NITRO_PRESET=node-server

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
