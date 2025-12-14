FROM node:20-alpine AS build
WORKDIR /app

COPY backend/package*.json ./
RUN npm install
COPY backend/tsconfig.json ./tsconfig.json
COPY backend/src ./src
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 4000
CMD ["node", "dist/index.js"]
