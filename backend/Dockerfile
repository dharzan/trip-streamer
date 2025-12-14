FROM node:20-alpine AS build
WORKDIR /app

# Ensure dev dependencies (like TypeScript) are installed in this stage.
ENV NODE_ENV=development \
    NPM_CONFIG_PRODUCTION=false \
    NPM_CONFIG_PACKAGE_LOCK=false

COPY backend/package*.json ./
RUN npm install --include=dev && npx tsc --version
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
