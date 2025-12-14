FROM node:20-alpine AS build
WORKDIR /app/workers/kafka-producer

ENV NODE_ENV=development

COPY workers/kafka-producer/package*.json ./
COPY workers/kafka-producer/tsconfig.json ./
COPY workers/kafka-producer/src ./src

RUN npm install --include=dev
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine
WORKDIR /app/workers/kafka-producer

ENV NODE_ENV=production

COPY workers/kafka-producer/package*.json ./
COPY --from=build /app/workers/kafka-producer/node_modules ./node_modules
COPY --from=build /app/workers/kafka-producer/dist ./dist

CMD ["node", "dist/index.js"]
