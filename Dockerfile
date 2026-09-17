# ==============================================================================
# Multi-Stage Dockerfile for Bitmask IAM Backend (NestJS 12 ESM)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Base image
# ------------------------------------------------------------------------------
FROM node:22-alpine AS base

WORKDIR /app

# ------------------------------------------------------------------------------
# Stage 2: Dependencies & Build
# ------------------------------------------------------------------------------
FROM base AS builder

# Install all dependencies (including devDependencies needed for build)
COPY package.json package-lock.json ./
RUN npm ci

# Copy project source and configuration files
COPY tsconfig*.json nest-cli.json ./
COPY src/ ./src/

# Compile TypeScript to JavaScript in /dist
RUN npm run build

# Remove development dependencies to keep production image slim
RUN npm prune --omit=dev

# ------------------------------------------------------------------------------
# Stage 3: Development Image (Optional target for docker-compose development)
# ------------------------------------------------------------------------------
FROM base AS development

ENV NODE_ENV=development
ENV PORT=4001

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src/ ./src/

EXPOSE 4001

CMD ["npm", "run", "start:dev"]

# ------------------------------------------------------------------------------
# Stage 4: Production Runtime
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4001

# Run as non-root user for security
USER node

# Copy package descriptors
COPY --chown=node:node package.json package-lock.json ./

# Copy production node_modules from builder
COPY --chown=node:node --from=builder /app/node_modules ./node_modules

# Copy compiled output from builder
COPY --chown=node:node --from=builder /app/dist ./dist

# Expose backend API port
EXPOSE 4001

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4001/api/v1/health || exit 1

# Start the compiled production application
CMD ["node", "dist/main.js"]
