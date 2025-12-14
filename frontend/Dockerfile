FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_GRAPHQL_URL=/api
ARG VITE_RAG_URL=/rag
ENV VITE_GRAPHQL_URL=${VITE_GRAPHQL_URL}
ENV VITE_RAG_URL=${VITE_RAG_URL}

COPY frontend/package*.json ./
RUN npm install
COPY frontend/tsconfig.json ./tsconfig.json
COPY frontend/vite.config.ts ./vite.config.ts
COPY frontend/src ./src
COPY frontend/index.html ./index.html
RUN npm run build

FROM nginx:alpine
COPY nginx/docker.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
