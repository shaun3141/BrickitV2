# Build stage for React app
FROM node:20-alpine AS client-builder

WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./

# Install client dependencies
RUN npm ci

# Copy client source
COPY client/ ./

# Build the client app
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy server files
COPY server/package*.json ./
RUN npm ci --only=production

COPY server/ ./

# Copy built client files from builder stage
COPY --from=client-builder /app/client/dist ./client/dist

# Expose port
EXPOSE 8080

# Start the server
CMD ["node", "index.js"]

