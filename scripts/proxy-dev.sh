#!/usr/bin/env bash
set -euo pipefail

pnpm dev:nginx

echo 'Dev proxy is running at http://localhost:8080 (routes frontend/API/RAG)'
