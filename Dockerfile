# syntax=docker/dockerfile:1

# ---------- deps: install node_modules with Bun (project uses bun.lock) ----------
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY prisma ./prisma
# postinstall runs `prisma generate`, hence the prisma schema above
RUN bun install --frozen-lockfile

# ---------- builder: compile the Next.js app ----------
FROM oven/bun:1 AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    SKIP_ENV_VALIDATION=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# ---------- runner: minimal production image ----------
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# OpenSSL is required by the Prisma query engine
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 1001 nodejs \
    && useradd --uid 1001 --gid nodejs --shell /bin/false --create-home nextjs

# Static assets and the standalone server bundle
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma schema/migrations + CLI so the entrypoint can run `migrate deploy`
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs
EXPOSE 3000
# Apply pending migrations (a no-op when up to date), then start the server.
# `exec` makes node PID 1 so it receives SIGTERM from `docker stop`.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && exec node server.js"]
