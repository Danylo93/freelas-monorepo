# Local Dev no Windows com WSL + Docker Desktop

## Pré‑requisitos
- Windows 11/10 com WSL2 e Docker Desktop (integração WSL habilitada)
- Node.js 20+ e Yarn (classic) no Windows

## Subindo a infra (Kafka/Redis) no WSL
```powershell
# na raiz do repo
docker compose -f infra/docker-compose.yml up -d

# Verifique as portas no Windows (host):
# Kafka: localhost:19092 | Redis: localhost:6379
```

## Rodando serviços no Windows (recomendado)
Em sessões separadas do PowerShell:

```powershell
# API
cd api
$env:USE_REAL_KAFKA='true'; $env:USE_REAL_REDIS='true'; $env:API_PORT='3001'
yarn && yarn dev

# Matcher
cd ..\matcher
$env:USE_REAL_KAFKA='true'; $env:USE_REAL_REDIS='true'
yarn && yarn dev

# Web
cd ..\web
yarn && yarn dev  # http://localhost:3000 (consome http://localhost:3001)

# Mobile (Expo) – sem Docker
cd ..\mobile
yarn && yarn start
```

As variáveis acima também estão em `.env.example` (copie como referência). A API e o Matcher usam mocks se `USE_REAL_KAFKA/REDIS` não estiverem como `true`.

## (Opcional) Rodando API/Matcher dentro do Docker
Com a infra já no ar, você pode subir os containers de app (eles se conectam à mesma rede `freelas_net`):

```powershell
docker compose -f api/docker-compose.yml up -d     # expõe API em :3001
docker compose -f matcher/docker-compose.yml up -d # worker
```

## Dicas para Windows/WSL
- Desempenho: projetos em `\\wsl$` são mais rápidos do que em `C:\\` ao montar volumes no Docker.
- Rede: de apps no Windows para containers no WSL use `localhost` (ex.: Kafka `localhost:19092`, Redis `localhost:6379`). Containers dos apps usam DNS dos serviços (`redpanda`, `redis`) via rede `freelas_net`.

## Troubleshooting
- Kafka: confirme `docker ps`, porta `19092` publicada, e `KAFKA_BROKERS=localhost:19092` (Windows) ou `redpanda:9092` (containers).
- Redis: teste `redis-cli -h localhost -p 6379 ping` (ou Redis Insight).
