import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config.js";
import { setupWebsocket } from "./websocket.js";
import { initKafka } from "./kafka.js";
import { registerKafkaConsumers } from "./consumers.js";
import { registerProviderRoutes } from "./routes/providers.js";
import { registerRequestRoutes } from "./routes/requests.js";

export async function startServer() {
  const app = Fastify({ logger: true });
  // Health endpoints first, so probes pass even se algo falhar depois
  app.get('/healthz', async () => ({ ok: true }));
  app.get('/livez', async () => ({ ok: true }));
  await app.register(cors, { origin: true });
  await app.register(rateLimit, { max: 200, timeWindow: '1 minute' });
  const { io } = setupWebsocket(app);
  await initKafka();
  await registerKafkaConsumers(io);
  registerProviderRoutes(app, io);
  registerRequestRoutes(app, io);
  await app.listen({ port: config.port, host: config.host });
  console.log(`API on ${config.host}:${config.port}`);
}
