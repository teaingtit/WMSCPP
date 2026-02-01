# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including dev, needed for build)
RUN npm install --legacy-peer-deps

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variable for build
ENV NEXT_TELEMETRY_DISABLED=1
# Skip static page generation during build (ป้องกัน Supabase connection errors)
ENV SKIP_ENV_VALIDATION=1
# Build-time Supabase config (จะถูก override ด้วยค่าจริงตอน runtime)
ENV NEXT_PUBLIC_SUPABASE_URL=https://wpufstdvknzrrsvmcgwu.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwdWZzdGR2a256cnJzdm1jZ3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjE0NjYsImV4cCI6MjA4NTI5NzQ2Nn0.iFJZNPzi6exfXxH1YgWohRYrw0SYdfbeQR79LicEV6w

# Build the application
RUN npm run build

# ============================================
# Stage 3: Runner (Production)
# ============================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install wget for health checks
RUN apk add --no-cache wget

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set correct permissions
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# Prevent Supabase/cookie headers overflow (see health route)
ENV NODE_OPTIONS="--max-http-header-size=65536"

# Start the application
CMD ["node", "server.js"]
