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

### Ambientes (dev | hmg | prd) com Ingress e HPA

Pré‑requisitos adicionais (gratuitos):
- Metrics Server: `kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml`
- NGINX Ingress Controller:
  - Helm (recomendado):
    - `helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx`
    - `helm install ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx --create-namespace`
  - Ou manifest estático:
    - `kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.0/deploy/static/provider/cloud/deploy.yaml`

Overlays prontos:
```bash
# DEV (hosts: api.dev.localtest.me, web.dev.localtest.me)
kubectl apply -k k8s/overlays/dev

# HMG (hosts: api.hmg.localtest.me, web.hmg.localtest.me)
kubectl apply -k k8s/overlays/hmg

# PRD (hosts: api.prd.localtest.me, web.prd.localtest.me)
kubectl apply -k k8s/overlays/prd
```

Imagens por ambiente (tags):
```bash
# dev
docker build -t freelas-api:dev ./api
docker build -t freelas-matcher:dev ./matcher
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.dev.localtest.me -t freelas-web:dev ./web

# hmg
docker build -t freelas-api:hmg ./api
docker build -t freelas-matcher:hmg ./matcher
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.hmg.localtest.me -t freelas-web:hmg ./web

# prd
docker build -t freelas-api:prd ./api
docker build -t freelas-matcher:prd ./matcher
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.prd.localtest.me -t freelas-web:prd ./web
```

Notas:
- `localtest.me` resolve para 127.0.0.1; redireciona para o Ingress local (Docker Desktop/Kind expõe via LoadBalancer/NodePort). Se preferir, adicione entradas no `hosts` e use domínios próprios.
- HPA requer `requests` de CPU (já definidos) e metrics‑server instalado.

## Ambientes (dev | hmg | prd)

- Variável `APP_ENV` guia o comportamento e credenciais. Use `.env` locais por serviço ou variáveis no cluster/CI.
- Exemplo de `.env.example` inclui todas as chaves. Para o Web, `NEXT_PUBLIC_API_URL` deve ser acessível pelo navegador.
- K8s via Kustomize permite aplicar somente infra (`k8s/overlays/infra`) e apps (`k8s/overlays/apps`). Você pode criar overlays específicos por ambiente ajustando imagens, variáveis e Ingress.

## Testes e Qualidade

- Testes unitários com Vitest em `api` e `matcher`:
  - `cd api && yarn test`
  - `cd matcher && yarn test`
- CI GitHub Actions (`.github/workflows/ci.yml`) executa build + testes a cada push/PR.
- API segue princípios SOLID/DDD mínimos: rotas delegam para serviços (`src/application/*`) e infraestrutura (`src/redis.ts`).

## CI/CD (GitHub Actions)

- CI: `.github/workflows/ci.yml` roda por serviço (api/matcher/web) só quando houver mudanças no respectivo diretório.
- Release: `.github/workflows/release.yaml` builda e publica imagens no Docker Hub por serviço e ambiente (tags: `<env>` e `<env>-<sha>`), disparado automaticamente após o CI com sucesso.
- CD: `.github/workflows/cd.yaml` atualiza o repositório GitOps com as tags imutáveis (`<env>-<sha>`) para o ArgoCD sincronizar, disparado após o Release.
  - Branch `develop` → `dev`, `hmg` → `hmg`, `main/master` → `prd`
  - Também pode ser disparado manualmente (`workflow_dispatch`)

Secrets necessários no repositório:
- Docker Hub:
  - `DOCKER_USERNAME` e `DOCKER_PASSWORD` (se não definir, usa `dan1993` como padrão)
- GitOps (repositório monitorado pelo ArgoCD):
  - `GITOPS_REPO` (ex.: `usuario/gitops-argocd`)
  - `GITOPS_TOKEN` (PAT com escopo `repo`) 

Notas do deploy:
- O pipeline ajusta as imagens no overlay do repositório GitOps e faz push — o ArgoCD detecta e sincroniza.
- Ao buildar Web, é passada `NEXT_PUBLIC_API_URL=http://api.<env>.localtest.me`.



---------------------


Perfeito — segue um guia direto de como obter e configurar cada variável usada nos releases/deploys. Onde não configurar, o passo de deploy é pulado e a imagem é publicada normalmente no Docker Hub.

Onde adicionar

GitHub → Settings → Secrets and variables → Actions → New repository secret
Adicione as chaves exatamente como abaixo.
Obrigatórias (publicar no Docker Hub)

DOCKER_USERNAME: seu usuário do Docker Hub (ex.: dan1993).
DOCKER_PASSWORD: use um Access Token do Docker Hub.
Docker Hub → Account Settings → Security → New Access Token.
Evite senha da conta (2FA quebra login por senha).
Opcionais (fazer deploy direto via kubectl)
Observação importante: o deploy direto só funciona se o runner do GitHub conseguir alcançar o endpoint do seu cluster (AKS/EKS/GKE ou um runner self‑hosted dentro da sua rede). Se o cluster for local (Docker Desktop/WSL/kind/minikube), um runner hospedado pelo GitHub NÃO alcança — nesse caso, não configure kubeconfig e o pipeline vai “Skip deploy (no kubeconfig)”. Alternativas: self‑hosted runner ou GitOps (ArgoCD) mais tarde.

KUBECONFIG_B64_DEV, KUBECONFIG_B64_HMG, KUBECONFIG_B64_PRD (ou KUBECONFIG_B64 genérico)
Conteúdo: o kubeconfig do cluster codificado em base64 (uma linha).
Como gerar o base64 do kubeconfig

Docker Desktop (Windows):
Caminho típico: C:\Users\SEU_USUARIO.kube\config
PowerShell:
$bytes = [IO.File]::ReadAllBytes("$HOME.kube\config")
[Convert]::ToBase64String($bytes)
Copie a string e cole no secret (ex.: KUBECONFIG_B64_DEV).
Linux/WSL/macOS:
bash/sh:
base64 -w0 ~/.kube/config
ou no macOS (sem -w):
base64 ~/.kube/config | tr -d '\n'
AKS:
az login
az aks get-credentials -g <resource-group> -n <cluster>
Gere o base64 do ~/.kube/config e crie o secret.
EKS:
aws eks update-kubeconfig --region <reg> --name <cluster>
Gere o base64 do ~/.kube/config e crie o secret.
GKE:
gcloud auth login
gcloud container clusters get-credentials <cluster> --zone <zona> --project <proj>
Gere o base64 do ~/.kube/config e crie o secret.
Como o ambiente é escolhido

Quando o release dispara automaticamente após o CI: o ambiente vem do branch
develop → dev
hmg → hmg
main/master → prd
Quando você dispara manualmente: escolhe o environment (dev/hmg/prd) no formulário.
As tags publicadas no Docker Hub:
dan1993/freelas-<service>:<env> e :<env>-<sha> (imutável)
O Web recebe NEXT_PUBLIC_API_URL automaticamente como http://api.<env>.localtest.me no build.
Validação rápida

Sem kubeconfig: releases vão publicar imagens e mostrar no Step Summary “Deploy: skipped (no kubeconfig)”.
Com kubeconfig válido (e cluster acessível do runner): após publicar, aplicam k8s/overlays/<env> com a imagem <env>-<sha> e mostram “Deploy: applied via kustomize”.