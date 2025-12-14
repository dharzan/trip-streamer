FROM node:20-alpine AS build
WORKDIR /app/services/rag-assistant

ENV NODE_ENV=development

COPY services/rag-assistant/package*.json ./
COPY services/rag-assistant/tsconfig.json ./
COPY services/rag-assistant/src ./src

RUN npm install --include=dev
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine
WORKDIR /app/services/rag-assistant

ENV NODE_ENV=production

COPY services/rag-assistant/package*.json ./
COPY --from=build /app/services/rag-assistant/node_modules ./node_modules
COPY --from=build /app/services/rag-assistant/dist ./dist

EXPOSE 7070

CMD ["node", "dist/server.js"]
