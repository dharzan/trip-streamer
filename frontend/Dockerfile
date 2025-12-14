FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_GRAPHQL_URL=/api
ARG VITE_RAG_URL=/rag

ENV VITE_GRAPHQL_URL=$VITE_GRAPHQL_URL
ENV VITE_RAG_URL=$VITE_RAG_URL

# Install dependencies separately to leverage Docker layer caching.
COPY frontend/package.json ./package.json
RUN npm install --include=dev

# Copy the rest of the frontend sources and build the production bundle.
COPY frontend/ ./
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx/docker.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD nc -z localhost 80 || exit 1
