FROM node:20-alpine AS build
WORKDIR /app/backend

ENV NODE_ENV=development

COPY backend/package*.json ./
COPY backend/tsconfig.json ./
COPY backend/src ./src

RUN npm install --include=dev
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine
WORKDIR /app/backend

ENV NODE_ENV=production

COPY backend/package*.json ./
COPY --from=build /app/backend/node_modules ./node_modules
COPY --from=build /app/backend/dist ./dist

EXPOSE 4000

CMD ["node", "dist/index.js"]
