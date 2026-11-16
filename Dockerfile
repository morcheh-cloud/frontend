# syntax=docker/dockerfile:1
#
# Morche panel (Next.js, standalone output). Every request runs in the
# browser, so the backend's public address ends up in the built JavaScript.
# By default the image is built with a placeholder and docker-entrypoint.sh
# writes the real address from API_URL when the container starts:
#   docker build -t morche-frontend .
#   docker run -e API_URL=https://api.example.com -p 3200:3200 morche-frontend
# Or bake one address in (API_URL is then ignored):
#   docker build --build-arg NEXT_PUBLIC_API_URL=https://api.example.com .

ARG NODE_VERSION=26.12.1
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
ARG NEXT_PUBLIC_API_URL=__MORCHE_API_URL__
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ---- runtime ------------------------------------------------------------------
FROM node:${NODE_VERSION}-slim
LABEL org.opencontainers.image.source=https://github.com/morche-cloud/frontend \
      org.opencontainers.image.title="Morche panel" \
      org.opencontainers.image.description="Web panel for Morche: SSH-based server management and monitoring"
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3200 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --chmod=0755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
USER node
EXPOSE 3200
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/login').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
