# Multi-stage Dockerfile for Next.js 16 + Prisma + MySQL
# Standalone output keeps the runtime image small.

# ---- deps ----
FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- builder ----
FROM node:24-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate Prisma client before building Next (Next imports the generated client).
RUN pnpm exec prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ---- prisma-cli ----
# Self-contained Prisma CLI install (npm, flat node_modules) so @prisma/engines
# resolves at runtime. Avoids pnpm's symlink layout, which Docker COPY breaks.
FROM node:24-alpine AS prisma-cli
RUN apk add --no-cache libc6-compat openssl
WORKDIR /prisma-cli
RUN echo '{"name":"prisma-cli","version":"0.0.0","private":true}' > package.json \
  && npm install --no-audit --no-fund prisma@7.8.0

# ---- runner ----
FROM node:24-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Standalone server bundle.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma CLI for migrations — self-contained, isolated from the standalone
# bundle's node_modules.
COPY --from=prisma-cli --chown=nextjs:nodejs /prisma-cli /prisma-cli
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run migrations before starting the server. Single-replica deploy → no race.
CMD ["sh", "-c", "node /prisma-cli/node_modules/prisma/build/index.js migrate deploy --schema=/app/prisma/schema.prisma && node server.js"]
