# tsb-core/Dockerfile

# Use Node 18.17-alpine as the base image
FROM node:18.17-alpine

# Set the working directory
WORKDIR /usr/src/app

# Create www-data user and group
#RUN addgroup -S www-data && adduser -S www-data -G www-data

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the application code
COPY . .

RUN mkdir public/images/compressed

RUN node utils/sharp.js

#  Build the Next.js app & start the app
CMD sh -c "npm run build && npm start"
