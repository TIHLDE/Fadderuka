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

# ---------- migrator: standalone Prisma CLI for `migrate deploy` ----------
# Copying only node_modules/prisma into the runner is not enough: the CLI needs
# its dependencies too (effect, c12, …), and without them the container crashes
# before the server starts. Install it on its own, at the exact version from
# bun.lock, on the same base image as the runner so the engines match.
FROM node:22-slim AS migrator
WORKDIR /migrator
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules/prisma/package.json /tmp/prisma-package.json
RUN npm install --no-save --no-package-lock --no-audit --no-fund \
    "prisma@$(node -p "require('/tmp/prisma-package.json').version")"

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

# Prisma schema/migrations, and the Prisma client engine the server needs
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# The Prisma CLI with its whole dependency tree, kept apart from the app's
# trimmed node_modules (see the migrator stage)
COPY --from=migrator /migrator/node_modules ./migrator/node_modules

USER nextjs
EXPOSE 3000
# Apply pending migrations (a no-op when up to date), then start the server.
# `exec` makes node PID 1 so it receives SIGTERM from `docker stop`.
CMD ["sh", "-c", "node migrator/node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma && exec node server.js"]
