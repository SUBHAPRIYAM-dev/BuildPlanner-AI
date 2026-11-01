FROM node:24-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@12.4.2

# Copy package manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/ packages/
COPY apps/api/ apps/api/

# Install dependencies and build packages and API
RUN pnpm install --frozen-lockfile
RUN pnpm -r --filter "@buildplanner/*" run build
RUN pnpm --filter @buildplanner/api run build

FROM node:24-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm@12.4.2

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/ packages/
COPY apps/api/package.json apps/api/
COPY --from=base /app/apps/api/dist apps/api/dist
COPY --from=base /app/packages/ packages/

ENV NODE_ENV=production
ENV PORT=5000

RUN pnpm install --prod --frozen-lockfile

EXPOSE 5000
CMD ["node", "apps/api/dist/index.js"]
