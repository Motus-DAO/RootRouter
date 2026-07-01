# RootRouter dashboard — build from monorepo root (docker build -f apps/dashboard/Dockerfile .)
FROM node:22-bookworm AS builder
WORKDIR /repo

COPY package.json package-lock.json ./
COPY packages/sdk/package.json packages/sdk/
COPY packages/proxy/package.json packages/proxy/
COPY packages/mcp/package.json packages/mcp/
COPY apps/dashboard/package.json apps/dashboard/

RUN npm ci

COPY apps/dashboard apps/dashboard

ARG NEXT_PUBLIC_CONVEX_URL
ENV NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL

RUN npm run dashboard:build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd -r nodejs && useradd -r -g nodejs nodejs

COPY --from=builder /repo/apps/dashboard/public ./apps/dashboard/public
COPY --from=builder /repo/apps/dashboard/.next/standalone ./
COPY --from=builder /repo/apps/dashboard/.next/static ./apps/dashboard/.next/static

USER nodejs
EXPOSE 3000

CMD ["node", "apps/dashboard/server.js"]
