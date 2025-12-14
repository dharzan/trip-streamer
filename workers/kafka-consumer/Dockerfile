FROM node:20-alpine AS build
WORKDIR /app/workers/kafka-consumer

ENV NODE_ENV=development

COPY workers/kafka-consumer/package*.json ./
COPY workers/kafka-consumer/tsconfig.json ./
COPY workers/kafka-consumer/src ./src

RUN npm install --include=dev
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine
WORKDIR /app/workers/kafka-consumer

ENV NODE_ENV=production

COPY workers/kafka-consumer/package*.json ./
COPY --from=build /app/workers/kafka-consumer/node_modules ./node_modules
COPY --from=build /app/workers/kafka-consumer/dist ./dist

CMD ["node", "dist/index.js"]
