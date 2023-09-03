# tsb-core/Dockerfile

# Use Node 18.17-alpine as the base image
FROM node:18.17-alpine

# Set the working directory
WORKDIR /usr/src/app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the application code
COPY . .

# Build the Next.js app
#RUN npm run build

# Start the app
#CMD ["npm", "start"]

CMD ["npm", "run", "dev"]
