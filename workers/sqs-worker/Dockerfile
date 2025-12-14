FROM node:20-alpine AS build
WORKDIR /app/workers/sqs-worker

ENV NODE_ENV=development

COPY workers/sqs-worker/package*.json ./
COPY workers/sqs-worker/tsconfig.json ./
COPY workers/sqs-worker/src ./src

# Ignore the stale package-lock that points to pnpm symlinks so npm installs real deps
RUN npm install --include=dev --package-lock=false
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine
WORKDIR /app/workers/sqs-worker

ENV NODE_ENV=production

COPY workers/sqs-worker/package*.json ./
COPY --from=build /app/workers/sqs-worker/node_modules ./node_modules
COPY --from=build /app/workers/sqs-worker/dist ./dist

CMD ["node", "dist/index.js"]
