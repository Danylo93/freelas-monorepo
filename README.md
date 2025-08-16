# Freelas (Uber-like) — Monorepo

Stack:
- **Web (Next.js + TypeScript)**: client portal, interactive map, request flow.
- **Mobile (Expo React Native + TypeScript)**: provider app (accept jobs, live location).
- **API (Fastify + TypeScript)**: REST + Socket.IO gateway; Redis Geo for proximity; Kafka events.
- **Matcher (Worker + TypeScript)**: consumes `service.requested`, finds providers nearby, emits offers.
- **Shared (Types)**: event contracts and DTOs.
- **Infra**: Docker Compose for local dev (Kafka via Redpanda, Redis), Strimzi manifests for k8s.

## Quickstart (local)
```bash
# Reqs: Node 20+, pnpm 9+, Docker
pnpm i
pnpm -w build

# Start infra
docker compose -f infra/docker-compose.yml up -d

# Start services
pnpm --filter @freelas/api dev
pnpm --filter @freelas/matcher dev
pnpm --filter @freelas/web dev
pnpm --filter @freelas/mobile start
```
