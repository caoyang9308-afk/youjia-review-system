FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables
ENV COZE_SUPABASE_URL=https://br-grand-grue-b150b09a.supabase2.aidap-global.cn-beijing.volces.com
ENV COZE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjMzNjUxMjEwNzEsInJvbGUiOiJhbm9uIn0.-oSG7Uvdp4dy_szwTde1pHNgklJjrXWFLGoQptkqfrU
ENV COZE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjMzNjUxMjEwNzEsInJvbGUiOiJzZXJ2aWNlX3JvbGUifQ.7HOv0t047p8qwWOI81Q9lb2MlxEh5MWyB60J-i0SDmI
ENV COZE_PROJECT_ENV=PROD

# Build the project
RUN corepack enable pnpm && pnpm build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV COZE_PROJECT_ENV=PROD

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
