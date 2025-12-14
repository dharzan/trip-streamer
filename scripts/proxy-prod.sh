#!/usr/bin/env bash
set -euo pipefail

if [ ! -d frontend/dist ]; then
  echo 'frontend/dist not found; running build...'
  pnpm --filter frontend build
fi

docker ps -a --format '{{.Names}}' | grep -q '^trip_nginx_prod$' && docker rm -f trip_nginx_prod >/dev/null 2>&1 || true

docker run -d \
  --name trip_nginx_prod \
  -p 9090:80 \
  --add-host host.docker.internal:host-gateway \
  -v "$(pwd)/frontend/dist:/usr/share/nginx/html:ro" \
  -v "$(pwd)/nginx/prod.conf:/etc/nginx/conf.d/default.conf:ro" \
  nginx:alpine >/dev/null

echo 'Production-style proxy is running at http://localhost:9090 (serves built frontend + proxies API/RAG)'
