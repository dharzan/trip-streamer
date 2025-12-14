# TripStreamer Monorepo

TripStreamer simulates a travel-deal streaming pipeline:
Kafka producer → Kafka consumer (filters) → SQS queue → SQS worker → Postgres → GraphQL API → React UI → Jest/Playwright E2E.
Everything lives inside a pnpm workspace so infra, services, and tests can be orchestrated from one place.

## Quick Start
Prerequisites: `pnpm` (v9+), Docker Desktop.

Run (in the repo root):

```bash
pnpm install
pnpm infra:up          # start Kafka, LocalStack, Postgres, Redis
# Start everything with one command (recommended for local dev):
pnpm dev:stack         # starts infra + all services

# Or start services individually:
pnpm dev:backend       # GraphQL API (Apollo)
pnpm dev:kafka-producer
pnpm dev:kafka-consumer
pnpm dev:sqs-worker
pnpm dev:frontend      # Vite dev server (5173)
pnpm dev:rag-assistant # RAG assistant (7070)
pnpm dev:nginx         # optional: reverse proxy on http://localhost:8080

# Convenience scripts for proxies
pnpm proxy:dev         # shorthand for pnpm dev:nginx
pnpm proxy:prod        # serve built frontend via Nginx on http://localhost:9090

# Run the entire stack with Docker containers (builds each service image)
pnpm docker:up
# Tear everything down (containers + networks)
pnpm docker:down
```

Stop infra and clean up:

```bash
pnpm infra:down
```

## Dockerized Stack
Prefer containers instead of pnpm dev servers? Build and run every service (backend, workers, rag assistant, static frontend + reverse proxy) with a single command:

```bash
pnpm docker:up
```

This spins up:
- Backend API (`http://localhost:4000`)
- Kafka producer/consumer, SQS worker, rag assistant (internal services)
- Static frontend served via Nginx (`http://localhost:8081`, proxies `/api` and `/rag`)

When finished:

```bash
pnpm docker:down
```

> The same `docker-compose.yml` still powers infra-only workflows (`pnpm infra:up`), so you can mix & match.

## Ports & Endpoints
- GraphQL (backend): `http://localhost:4000/` (playground printed on boot)
- Frontend (Vite): `http://localhost:5173/`
- Frontend (Dockerized): `http://localhost:8081/`
- Nginx proxy (optional): `http://localhost:8080/` (proxies frontend + APIs)
- Production preview proxy: `http://localhost:9090/` (serves built frontend + proxies APIs via `pnpm proxy:prod`)
- Kafka broker: `localhost:9092`
- LocalStack (SQS): `http://localhost:4566` (queue: `deals-alerts`)
- Postgres: `postgres://tripstreamer:tripstreamer@localhost:5432/tripstreamer`
- Redis: `redis://localhost:6379`
- RAG assistant: `http://localhost:7070` (API on `/api/documents` and `/api/query`)

## Tech Stack
- TypeScript / Node.js
- Kafka / Redpanda (docker)
- LocalStack SQS (docker)
- Postgres
- GraphQL (Apollo Server)
- React + Apollo Client
- Jest + Playwright (E2E)
- Redis (docker)
- Express + Postgres (RAG assistant)

## Redis Responsibilities
1. **GraphQL cache for `activeDeals`**
   - Keys: `cache:deals:active` and `cache:deals:active:dest=<DEST>:max=<PRICE>`
   - TTL: 15–30 seconds
   - Invalidate on new deal insert by deleting `cache:deals:active`
2. **Destination stats**
   - Key: `stats:deals:dest:<DEST>`
   - TTL: 60 seconds
3. **Idempotency for events**
   - Key: `event:processed:<eventId>`
   - TTL: 86,400 seconds (24 hours)

## Workspace Layout
- `backend/`: Apollo Server GraphQL API (TypeScript)
- `workers/kafka-producer`: publishes randomized deals to Kafka
- `workers/kafka-consumer`: filters Kafka deals and forwards eligible ones to SQS
- `workers/sqs-worker`: consumes SQS, persists to Postgres, manages Redis cache + stats
- `frontend/`: React + Apollo Client app powered by Vite
- `services/rag-assistant/`: lightweight vector store + retrieval API for AI insights
- `nginx/`: reverse-proxy configs (dev + prod)
- Service-specific Dockerfiles live inside each package (e.g., `backend/Dockerfile`, `workers/*/Dockerfile`, `frontend/Dockerfile`, `services/rag-assistant/Dockerfile`) and are referenced by `docker-compose.yml`.
- `e2e/`: Jest/Playwright tests (to be implemented)

## Root Scripts
- `pnpm infra:up` / `pnpm infra:down`: docker-compose orchestration (Kafka, LocalStack SQS, Postgres, Redis)
- `pnpm dev:stack`: start infra and all dev services together (convenience command)
- `pnpm dev:backend`, `pnpm dev:kafka-producer`, `pnpm dev:kafka-consumer`, `pnpm dev:sqs-worker`, `pnpm dev:frontend`, `pnpm dev:rag-assistant`, `pnpm dev:nginx`: individual dev servers/proxy
- `pnpm proxy:dev`, `pnpm proxy:prod`: helper scripts for Nginx dev/prod proxies
- `pnpm docker:up`, `pnpm docker:down`: build and run the entire stack using Docker containers (backend, workers, rag assistant, frontend)
- `pnpm test:e2e`: placeholder for the cross-service Jest/Playwright suite

## Acceptance Criteria
- Deals flow end-to-end and surface in the UI
- Jest or Playwright tests verify at least one deal renders
- Redis caching + idempotency behaviors described above are implemented
- README explains architecture and local dev steps
- RAG assistant stores deal summaries and serves retrieval results for future AI experiences

## RAG Assistant
`services/rag-assistant/` hosts an Express API (default port `7070`) that stores embeddings (simple hashed vectors) in Postgres and runs cosine-similarity search in memory.

- `POST /api/documents` ingests or updates snippets; the SQS worker posts every persisted deal as a short summary so the store stays in sync with new events.
- `POST /api/query` accepts a prompt, ranks top matches, and returns the documents plus a stitched response block for LLMs/UI.

Example usage:

```bash
# Ingest a doc
curl -X POST http://localhost:7070/api/documents \
  -H 'Content-Type: application/json' \
  -d '{ "source": "runbook", "text": "Alerting rules for SYD deals under $400." }'

# Query for insights
curl -X POST http://localhost:7070/api/query \
  -H 'Content-Type: application/json' \
  -d '{ "prompt": "What are the best SYD deals today?", "topK": 2 }'
```

## Environment
Override any of these via `.env` files inside each service if needed.

### Frontend configuration
- `VITE_GRAPHQL_URL` (default `http://localhost:4000/`) controls which backend endpoint the React app hits
- `VITE_RAG_URL` (default `http://localhost:7070`) controls which RAG assistant endpoint the UI uses for insights

### RAG assistant configuration
- `RAG_PORT` (default `7070`) sets the listening port
- `RAG_MAX_DOCS` controls how many documents are considered when ranking matches (default 5000)
- `RAG_SERVICE_URL` (default `http://localhost:7070`) is read by the SQS worker when posting new deal summaries

### Nginx proxy configuration
- `nginx/dev.conf` proxies `/` → Vite dev server (`host.docker.internal:5173`), `/api/` → backend (`:4000`), and `/rag/` → rag-assistant (`:7070`). Run `pnpm proxy:dev` and visit `http://localhost:8080` to exercise the entire stack through one origin (great for testing CORS-free scenarios). On Linux ensure Docker supports the `host.docker.internal` alias; if not, update the `extra_hosts` entry or edit the config to point at your host IP.
- `nginx/prod.conf` serves the built frontend from `/usr/share/nginx/html` and proxies APIs back to the host. Run `pnpm proxy:prod` after `pnpm --filter frontend build` to launch `trip_nginx_prod` (accessible at `http://localhost:9090`). Stop it with `docker rm -f trip_nginx_prod` when you’re finished.
- `nginx/docker.conf` is baked into the Dockerized frontend image and proxies `/api` → `backend-app:4000` and `/rag` → `rag-assistant-app:7070` when running the full stack via `docker-compose`. The resulting site is exposed on `http://localhost:8081`.
---
