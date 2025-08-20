import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { setupWebsocket } from "./websocket.js";
import { initKafka } from "./kafka.js";
import { registerKafkaConsumers } from "./consumers.js";
import { registerProviderRoutes } from "./routes/providers.js";
import { registerRequestRoutes } from "./routes/requests.js";

export async function startServer() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });
  const { io, httpServer } = setupWebsocket(app);
  await initKafka();
  await registerKafkaConsumers(io);
  registerProviderRoutes(app, io);
  registerRequestRoutes(app, io);
  httpServer.listen(config.port, () => {
    console.log(`API on :${config.port}`);
  });
}
