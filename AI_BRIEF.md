# TripStreamer AI Brief

## Goal
Build a production-like event-driven streaming system for travel deals:
Kafka producer -> Kafka consumer (filters) -> SQS queue -> SQS worker -> DB -> GraphQL API -> React UI -> Jest/Playwright E2E.

## Tech Stack
- TypeScript / Node.js
- Kafka (docker)
- LocalStack SQS (docker)
- Postgres (preferred)
- GraphQL (Apollo Server)
- React + Apollo Client
- Jest + Playwright (OSS)
- Redis (docker)

## Redis Requirements
1. **GraphQL cache for activeDeals**
   - Key: `cache:deals:active` (and `cache:deals:active:dest=<DEST>:max=<PRICE>`)
   - TTL: 15-30s
   - Invalidate on new deal insert: delete `cache:deals:active`
2. **Destination stats**
   - Key: `stats:deals:dest:<DEST>`
   - TTL: 60s
3. **Idempotency for events**
   - Key: `event:processed:<eventId>`
   - TTL: 86,400s (24h)

## Repository Structure
pnpm workspace with multiple services:
- `backend/`
- `workers/kafka-producer/`
- `workers/kafka-consumer/`
- `workers/sqs-worker/`
- `frontend/`
- `e2e/`

## Root Scripts
Defined in the monorepo `package.json`:
- `infra:up`, `infra:down`
- `dev:backend`, `dev:kafka-producer`, `dev:kafka-consumer`, `dev:sqs-worker`, `dev:frontend` 
- `test:e2e`

## Acceptance Criteria
- Deals flow end-to-end and appear in UI
- Jest or Playwright E2E verifies at least 1 deal shows up
- Redis caching + idempotency implemented
- README explains architecture and how to run locally

## Phase Guidance
1. Scaffold pnpm workspace + infra via Docker (Kafka + LocalStack SQS + Postgres + Redis).
2. Ensure backend boots with pnpm.
3. Implement workers, UI, and Jest/Playwright tests after infra is stable.
