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
5. Visit the Apollo Server URL printed in the console to run the GraphQL playground (query `activeDeals` to see cached deals).

Use `pnpm infra:down` to tear everything down (including persistent volumes).

## Workspace Layout
- `backend/`: Apollo Server GraphQL API (TypeScript).
- `workers/kafka-producer`: publishes randomized deals to Kafka.
- `workers/kafka-consumer`: filters Kafka deals and forwards eligible ones to SQS.
- `workers/sqs-worker`: consumes SQS, persists to Postgres, manages Redis cache + stats.
- `frontend/`: React + Apollo Client app powered by Vite + Apollo Client.
- `e2e/`: Jest/Playwright tests (to be implemented).

## Root Scripts
- `pnpm infra:up` / `pnpm infra:down`: docker-compose orchestration (Kafka, LocalStack SQS, Postgres, Redis).
- `pnpm dev:backend`, `pnpm dev:kafka-producer`, `pnpm dev:kafka-consumer`, `pnpm dev:sqs-worker`, `pnpm dev:frontend`: service dev servers.
- `pnpm test:e2e`: placeholder for the cross-service Jest/Playwright suite.

## Acceptance Criteria
- Deals flow end-to-end and surface in the UI.
- Jest or Playwright tests verify at least one deal renders.
- Redis caching + idempotency behaviors described above are implemented.
- README explains architecture and local dev steps.

## Phase Plan
1. Scaffold pnpm workspace + Docker infra (Kafka + LocalStack SQS + Postgres + Redis).
2. Ensure the backend boots via pnpm.
3. Implement workers, UI, and Jest/Playwright tests once infra is stable.

## RAG Copilot (Future)
- Introduce a `rag-assistant` service that embeds curated docs and notable deal summaries into a vector database (e.g., Postgres + pgvector).
- Event hooks from the SQS worker can push “interesting deal” summaries into the index so embeddings stay fresh.
- Expose a small REST/GraphQL endpoint that runs `embed → vector search → LLM completion`, combining retrieved passages with live `activeDeals` results to produce recommendations for the UI.
- Use Redis to debounce re-embedding or schedule periodic refresh jobs so the RAG store stays current.

## Environment
- Kafka broker: `localhost:9092`
- LocalStack SQS: `http://localhost:4566` with queue `deals-alerts`
- Postgres: `postgres://tripstreamer:tripstreamer@localhost:5432/tripstreamer`
- Redis: `redis://localhost:6379`

Override any of these via `.env` files inside each service if needed.

### Frontend configuration
- `VITE_GRAPHQL_URL` (default `http://localhost:4000/`) controls which backend endpoint the React app hits.
- Set it in `frontend/.env` when pointing the UI at a remote backend, e.g. `VITE_GRAPHQL_URL=https://staging.example.com/graphql`.
