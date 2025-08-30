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

## Kubernetes (Docker Desktop / Kind / K3d)

Pré‑requisitos:
- Docker Desktop com Kubernetes habilitado (ou Kind/K3d) e kubectl configurado
- Docker local para build das imagens

1) Crie o namespace e suba a infra (Redis + Redpanda):
```bash
kubectl apply -f k8s/namespace.yaml
kubectl -n freelas apply -f k8s/redis.yaml -f k8s/redpanda.yaml
kubectl -n freelas get pods
```

2) Construa as imagens localmente (Docker Desktop compartilha o mesmo daemon do K8s):
```bash
# API
docker build -t freelas-api:dev ./api

# Matcher
docker build -t freelas-matcher:dev ./matcher

# Web (ajuste a URL pública da API usada no navegador)
docker build \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:3001 \
  -t freelas-web:dev ./web
```

3) Aplique os manifests das apps:
```bash
kubectl -n freelas apply -f k8s/api.yaml -f k8s/matcher.yaml -f k8s/web.yaml
kubectl -n freelas get deploy,svc
```

4) Exponha localmente via port-forward (mais simples e portátil):
```bash
# API -> http://localhost:3001/healthz
kubectl -n freelas port-forward svc/api 3001:3001

# Em outro terminal: Web -> http://localhost:3000
kubectl -n freelas port-forward svc/web 3000:3000
```

Observações:
- As apps dentro do cluster usam `redpanda:9092` e `redis:6379` automaticamente (Service DNS).
- O `NEXT_PUBLIC_API_URL` precisa ser acessível pelo navegador; ao usar port-forward, defina para `http://localhost:3001` no build da imagem do Web.
- Para atualizar uma app: re‑build a imagem e `kubectl rollout restart deploy <nome> -n freelas`.

Troubleshooting:
- Pods sem iniciar: `kubectl -n freelas describe pod <nome>` e `kubectl -n freelas logs <pod>`
- API não responde: confira `svc/api` e probes, e se o port‑forward está ativo.
- Web chamando API errada: verifique o build arg `NEXT_PUBLIC_API_URL` usado na imagem do Web.

### Kustomize (perfis de aplicação)
Você pode aplicar tudo ou por partes usando Kustomize:

```bash
# Infra (namespace + Redis + Redpanda)
kubectl apply -k k8s/overlays/infra

# Apps (api + matcher + web)
kubectl apply -k k8s/overlays/apps

# Tudo de uma vez
kubectl apply -k k8s
```
