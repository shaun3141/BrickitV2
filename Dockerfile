# Build stage for React app
FROM node:20-alpine AS client-builder

WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./

# Install client dependencies
RUN npm ci

# Copy client source
COPY client/ ./

# Copy production environment file
COPY client/.env.production ./.env.production

# Build the client app with production env
RUN npm run build

# Build stage for TypeScript server
FROM node:20-alpine AS server-builder

WORKDIR /app/server

# Copy server package files
COPY server/package*.json ./
COPY server/tsconfig.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy server source
COPY server/src ./src

# Build TypeScript to JavaScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy server package files and install only production dependencies
COPY server/package*.json ./
RUN npm ci --only=production

# Copy built server files from builder stage
COPY --from=server-builder /app/server/dist ./dist

# Copy built client files from client builder stage
COPY --from=client-builder /app/client/dist ./client/dist

# Expose port
EXPOSE 8080

# Start the server
CMD ["node", "dist/index.js"]

