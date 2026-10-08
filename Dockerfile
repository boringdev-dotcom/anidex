# syntax=docker/dockerfile:1

# ---- build: install everything and produce dist/ ----
# Debian (glibc) for the build: Vite's and TypeScript's native binaries ship glibc builds.
FROM node:24-slim AS build
WORKDIR /app
ENV CI=true
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ---- runtime: production deps + built site + server ----
FROM node:24-alpine AS runtime
ENV NODE_ENV=production \
    PORT=10000
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server ./server
# curated species: the API's fallback when no database is configured, and the seed source
COPY src/data ./src/data
COPY scripts/db ./scripts/db
USER node
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" >/dev/null || exit 1
CMD ["node", "server/index.ts"]
