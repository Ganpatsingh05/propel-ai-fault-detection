# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install all dependencies (including dev dependencies for tsc)
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Production Stage
FROM node:20-alpine AS production

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled JavaScript from builder stage
COPY --from=builder /app/dist ./dist

# Switch to a non-root user for security
USER node

# Expose the API port
EXPOSE 5000

# Start the application using compiled JS
CMD ["npm", "start"]
