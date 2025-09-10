# Mobile Local Development

Siga os passos abaixo para testar o app mobile em tempo real contra a API local.

## 1. Preparar a API

```bash
# no diretório raiz
cd api
# build e subir a API e dependências (Redis/Kafka devem estar no network `freelas_net`)
docker compose up --build
```

A API ficará disponível em `http://localhost:3001`.

## 2. Configurar o app mobile

```bash
cd ../mobile
cp .env.example .env       # ajuste se acessar de um dispositivo físico
# iniciar o servidor do Expo com hot reload
EXPO_PUBLIC_API_URL=http://localhost:3001 yarn start
```

- Em emuladores Android use `http://10.0.2.2:3001`.
- Em dispositivos físicos substitua pelo IP da sua máquina acessível na rede.

Abra o app Expo Go e leia o QR code exibido para carregar o aplicativo com recarregamento em tempo real.

## 3. Testar funcionalidades

Com a API e o Expo em execução, qualquer alteração nos arquivos dentro de `mobile/` será refletida instantaneamente no aplicativo.
