FROM node:22-alpine

WORKDIR /app

# Copy dependency manifests first for layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy framework source, features, schemas, and test data
COPY . .

# Default CI command runs self-contained against local mock server
CMD ["npm", "run", "test:ci"]
