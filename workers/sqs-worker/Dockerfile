FROM node:20-alpine AS build
WORKDIR /app

COPY workers/sqs-worker/package*.json ./
RUN npm install
COPY workers/sqs-worker/tsconfig.json ./tsconfig.json
COPY workers/sqs-worker/src ./src
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

CMD ["node", "dist/index.js"]
