# syntax=docker/dockerfile:1
#
# Morche panel (Next.js, standalone output). Every request runs in the
# browser, so the backend's public address is baked in at build time:
#   docker build --build-arg NEXT_PUBLIC_API_URL=https://api.example.com -t morcheh-frontend .

ARG NODE_VERSION=26
ARG PNPM_VERSION=12.8.1

# ---- dependencies -------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS deps
WORKDIR /app
ARG PNPM_VERSION
# Node 25+ ships without corepack.
RUN npm install -g pnpm@${PNPM_VERSION}
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---- build --------------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS build
WORKDIR /app
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION}
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} NEXT_TELEMETRY_DISABLED=1
RUN test -n "$NEXT_PUBLIC_API_URL" || { echo "set --build-arg NEXT_PUBLIC_API_URL=<the backend's public address>"; exit 1; }
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ---- runtime ------------------------------------------------------------------
FROM node:${NODE_VERSION}-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3200 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3200
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/login').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "server.js"]
