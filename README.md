# TripStreamer Monorepo

TripStreamer simulates a travel-deal streaming pipeline:
Kafka producer → Kafka consumer (filters) → SQS queue → SQS worker → Postgres → GraphQL API → React UI → Jest/Playwright E2E.
Everything lives inside a pnpm workspace so infra, services, and tests can be orchestrated from one place.

## Tech Stack
- TypeScript / Node.js
- Kafka / Redpanda (docker)
- LocalStack SQS (docker)
- Postgres (preferred over SQLite)
- GraphQL (Apollo Server)
- React + Apollo Client
- Jest + Playwright (OSS)
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

## Getting Started
1. **Install pnpm** (v9+) and Docker Desktop.
2. **Install dependencies**: `pnpm install`
3. **Start core infra** (Kafka + LocalStack SQS + Postgres + Redis): `pnpm infra:up`
4. **Start services** (each in its own terminal tab):
   - Kafka producer: `pnpm dev:kafka-producer`
   - Kafka consumer: `pnpm dev:kafka-consumer`
   - SQS worker: `pnpm dev:sqs-worker`
   - Backend API: `pnpm dev:backend`
   - Frontend: `pnpm dev:frontend` (loads Vite dev server on port 5173)
   - RAG assistant: `pnpm dev:rag-assistant` (vector retrieval API on port 7070)
5. Visit the Apollo Server URL printed in the console to run the GraphQL playground (query `activeDeals` to see cached deals).

Use `pnpm infra:down` to tear everything down (including persistent volumes).

## Workspace Layout
- `backend/`: Apollo Server GraphQL API (TypeScript).
- `workers/kafka-producer`: publishes randomized deals to Kafka.
- `workers/kafka-consumer`: filters Kafka deals and forwards eligible ones to SQS.
- `workers/sqs-worker`: consumes SQS, persists to Postgres, manages Redis cache + stats.
- `frontend/`: React + Apollo Client app powered by Vite + Apollo Client.
- `services/rag-assistant/`: lightweight vector store + retrieval API for AI insights.
- `e2e/`: Jest/Playwright tests (to be implemented).

## Root Scripts
- `pnpm infra:up` / `pnpm infra:down`: docker-compose orchestration (Kafka, LocalStack SQS, Postgres, Redis).
- `pnpm dev:backend`, `pnpm dev:kafka-producer`, `pnpm dev:kafka-consumer`, `pnpm dev:sqs-worker`, `pnpm dev:frontend`, `pnpm dev:rag-assistant`: service dev servers.
- `pnpm test:e2e`: placeholder for the cross-service Jest/Playwright suite.

## Acceptance Criteria
- Deals flow end-to-end and surface in the UI.
- Jest or Playwright tests verify at least one deal renders.
- Redis caching + idempotency behaviors described above are implemented.
- README explains architecture and local dev steps.
- RAG assistant stores deal summaries and serves retrieval results for future AI experiences.

## Phase Plan
1. Scaffold pnpm workspace + Docker infra (Kafka + LocalStack SQS + Postgres + Redis).
2. Ensure the backend boots via pnpm.
3. Implement workers, UI, and Jest/Playwright tests once infra is stable.

## RAG Copilot
- `services/rag-assistant/` hosts an Express API on port 7070 that stores embeddings (simple hashed vectors) in Postgres and runs cosine similarity search in memory.
- `POST /api/documents` ingests or updates snippets; the SQS worker automatically pushes every persisted deal as a short summary so the store stays in sync with new events.
- `POST /api/query` accepts a prompt, ranks the top matches, and returns both the documents and a stitched response block that downstream callers can feed into an LLM or UI component.
- Bring your own high-fidelity embeddings/LLM if desired—the interface is intentionally simple so you can swap in a more powerful model or external vector DB later.

## Environment
- Kafka broker: `localhost:9092`
- LocalStack SQS: `http://localhost:4566` with queue `deals-alerts`
- Postgres: `postgres://tripstreamer:tripstreamer@localhost:5432/tripstreamer`
- Redis: `redis://localhost:6379`
- RAG assistant: `http://localhost:7070`

Override any of these via `.env` files inside each service if needed.

### Frontend configuration
- `VITE_GRAPHQL_URL` (default `http://localhost:4000/`) controls which backend endpoint the React app hits.
- Set it in `frontend/.env` when pointing the UI at a remote backend, e.g. `VITE_GRAPHQL_URL=https://staging.example.com/graphql`.

### RAG assistant configuration
- `RAG_PORT` (default `7070`) sets the listening port.
- `RAG_MAX_DOCS` controls how many documents are considered when ranking matches (default 5000).
- `RAG_SERVICE_URL` (default `http://localhost:7070`) is read by the SQS worker when posting new deal summaries.
- Example usage:

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
